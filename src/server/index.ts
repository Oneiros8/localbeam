import express, { Express } from "express";
import http, { Server as HttpServer } from "http";
import cors from "cors";
import { SignalingServer } from "./signaling/signalingServer";
import { registerDiscoveryRoute } from "./discovery/discoveryAPI";
import { BonjourService } from "./discovery/bonjour/bonjourService";
import { logInfo, logError, logWarn } from "../shared/utils/logger";
import { LocalBeamServerOptions } from "./types";

/**
 * LocalBeamServer — combines Express, WebSocket signaling, and Bonjour discovery.
 * Used by developers to easily start a local WebRTC coordination server.
 */
export class LocalBeamServer {
  private app: Express;
  private server: HttpServer;
  private signalingServer: SignalingServer;
  private bonjourService: BonjourService;
  private port: number;
  private serviceName: string;

  constructor(options: LocalBeamServerOptions = {}) {
    this.port = options.port || 5000;
    this.serviceName = options.serviceName || "LocalBeam Signaling Server";

    this.app = options.app || express();
    this.server = options.server || http.createServer(this.app);

    if (!options.app) {
      this.app.use(
        cors({
          origin: "*",
          methods: ["GET", "POST"],
          allowedHeaders: ["Content-Type"],
        })
      );
      logInfo("CORS enabled for LocalBeam internal Express server");
    }

    // REST route for Bonjour discovery
    registerDiscoveryRoute(this.app, this.serviceName);

    // WebSocket signaling setup
    this.signalingServer = new SignalingServer(this.server);

    // Bonjour advertisement setup
    this.bonjourService = new BonjourService({
      name: this.serviceName,
      type: "http",
      port: this.port,
    });
  }

  /** Start the LocalBeam server and Bonjour advertisement */
  start() {
    try {
      this.server.listen(this.port, () => {
        this.bonjourService.start();
        logInfo(`LocalBeam server running on port ${this.port}`);
      });
    } catch (err) {
      logError("Failed to start LocalBeam server", err);
    }
  }

  /** Stop all components gracefully */
  stop() {
    logWarn("Stopping LocalBeam server...");
    try {
      this.bonjourService.stop();
      this.signalingServer.close();
      this.server.close(() => logInfo("HTTP server closed"));
    } catch (err) {
      logError("Error stopping LocalBeam server", err);
    }
  }
}

/**
 * Helper factory for quick initialization
 */
export function createLocalBeamServer(options?: LocalBeamServerOptions) {
  const server = new LocalBeamServer(options);
  server.start();
  return server;
}
