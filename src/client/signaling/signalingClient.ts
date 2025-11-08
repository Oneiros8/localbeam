import { SignalMessage } from "../../shared/messageTypes";
import { logInfo, logWarn, logError } from "../../shared/utils/logger";
import EventEmitter from "eventemitter3";

// Lazy import to avoid bundling bonjour in browser builds
let bonjour: any;

export interface SignalingClientOptions {
  baseUrl?: string; // optional override (e.g., "http://192.168.1.21:5000" or "https://api.myapp.com")
  embeddedServer?: boolean; // if true, spin up local server in Node/Electron
  port?: number; // port for embedded server
}

/**
 * Hybrid Signaling Client:
 * - Browser → uses /discover API
 * - Node.js → uses Bonjour mDNS
 * - Embedded mode → spins up its own LocalBeamServer
 * - Fallback → localhost:5000
 */
export class SignalingClient extends EventEmitter {
  private socket: WebSocket | null = null;
  private messageQueue: string[] = [];
  private isConnected = false;
  private clientId: string;
  private baseUrl?: string;
  private embeddedServer?: boolean;
  private port?: number;
  private serverInstance: any = null;

  constructor(clientId?: string, options: SignalingClientOptions = {}) {
    super();
    this.clientId = clientId ?? "client-" + Math.floor(Math.random() * 10000);
    this.baseUrl = options.baseUrl;
    this.embeddedServer = options.embeddedServer;
    this.port = options.port ?? 5000;
  }

  async connect() {
    try {
      // If embedded mode is enabled and in Node environment
      if (this.embeddedServer && typeof window === "undefined") {
        logInfo("Embedded mode enabled — starting local signaling server...");
        const { createLocalBeamServer } = await import("../../server/index.js");
        this.serverInstance = createLocalBeamServer({
          port: this.port,
          serviceName: `LocalBeam Embedded Server (${this.clientId})`,
        });
        logInfo(`Local signaling server started on port ${this.port}`);
      }

      let signalingUrl: string | null = null;

      if (this.baseUrl) {
        logInfo(`Using provided base URL: ${this.baseUrl}`);
        const res = await fetch(`${this.baseUrl}/discover`);
        const data = await res.json();
        signalingUrl = data.url;
      } else if (typeof window !== "undefined") {
        logInfo("Browser detected — calling /discover");
        const res = await fetch("/discover");
        const data = await res.json();
        signalingUrl = data.url;
      } else {
        logInfo("Node environment detected — trying Bonjour discovery");
        const bonjourModule = await import("bonjour");
        bonjour = bonjourModule.default();

        signalingUrl = await new Promise<string>((resolve, reject) => {
          const browser = bonjour.find({ type: "http" });

          browser.on("up", (service: any) => {
            if (service.name.includes("LocalBeam")) {
              const address = service?.referer?.address || "127.0.0.1";
              logInfo(`Found Bonjour service: ${address}:${service.port}`);
              browser.stop();
              resolve(`ws://${address}:${service.port}`);
            }
          });

          setTimeout(() => {
            browser.stop();
            reject(new Error("Bonjour discovery timeout"));
          }, 3000);
        });
      }

      if (!signalingUrl) throw new Error("No signaling URL resolved");
      this.initWebSocket(signalingUrl);
    } catch (err) {
      logWarn(
        `Discovery failed (${(err as Error).message}), using localhost fallback`
      );
      this.initWebSocket(`ws://localhost:${this.port}`);
    }
  }

  private initWebSocket(url: string) {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.isConnected = true;
      logInfo(`WebSocket connected to ${url}`);

      const registerMsg: SignalMessage = {
        type: "register",
        clientId: this.clientId,
      };

      this.send(registerMsg);
      this.messageQueue.forEach((msg) => this.socket?.send(msg));
      this.messageQueue = [];

      this.emit("open");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit("message", data);
    };

    this.socket.onclose = () => {
      this.isConnected = false;
      logWarn("WebSocket connection closed");
      this.emit("close");
    };

    this.socket.onerror = (err) => {
      logError("WebSocket error:", err);
      this.emit("error", err);
    };
  }

  send(message: SignalMessage) {
    const messageStr = JSON.stringify(message);
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logWarn("Socket not open, queuing message...");
      this.messageQueue.push(messageStr);
      return;
    }
    this.socket.send(messageStr);
  }

  close() {
    this.socket?.close();
    if (this.serverInstance) {
      logInfo("Stopping embedded signaling server...");
      this.serverInstance.stop();
      this.serverInstance = null;
    }
  }
}
