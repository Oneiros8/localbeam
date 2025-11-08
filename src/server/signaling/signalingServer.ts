import { WebSocketServer, WebSocket } from "ws";
import { Server as HttpServer } from "http";
import { SignalMessage, PeerListMessage } from "../../shared/messageTypes";
import { logInfo, logWarn, logError } from "../../shared/utils/logger";

type ClientMap = Map<string, WebSocket>;

export class SignalingServer {
  private wss: WebSocketServer;
  private clients: ClientMap = new Map();

  constructor(serverOrPort: HttpServer | number) {
    if (typeof serverOrPort === "number") {
      this.wss = new WebSocketServer({ port: serverOrPort });
      logInfo(`WebSocket signaling server listening on port ${serverOrPort}`);
    } else {
      this.wss = new WebSocketServer({ server: serverOrPort });
      logInfo(`WebSocket signaling server attached to existing HTTP server`);
    }
    this.setupEvents();
  }

  private setupEvents() {
    this.wss.on("connection", (ws) => {
      logInfo("New WebSocket connection");
      ws.on("message", (msg) => this.handleMessage(ws, msg.toString()));
      ws.on("close", () => this.handleDisconnect(ws));
    });
  }

  private handleMessage(ws: WebSocket, msg: string) {
    try {
      const data: SignalMessage = JSON.parse(msg);
      const { type, clientId, targetId, payload } = data;

      switch (type) {
        case "register":
          if (!clientId) return logWarn("Register missing 'clientId'");
          this.clients.set(clientId, ws);
          logInfo(`Registered client: ${clientId}`);
          this.broadcastPeerList();
          break;

        case "offer":
        case "answer":
        case "candidate":
          if (!clientId || !targetId) return;
          const target = this.clients.get(targetId);
          if (target && target.readyState === WebSocket.OPEN) {
            target.send(JSON.stringify({ type, clientId, payload }));
            logInfo(`Relayed ${type} from ${clientId} → ${targetId}`);
          }
          break;
        default:
          logWarn(`Unknown message type: ${type}`);
          break;
      }
    } catch (err) {
      logError("Failed to parse WebSocket message", err);
    }
  }
  private handleDisconnect(ws: WebSocket) {
    for (const [id, clientWs] of this.clients.entries()) {
      if (clientWs === ws) {
        this.clients.delete(id);
        logWarn(`Client disconnected: ${id}`);
        this.broadcastPeerList();
        break;
      }
    }
  }

  private broadcastPeerList() {
    const peerListMsg: PeerListMessage = {
      type: "peer-list",
      peers: Array.from(this.clients.keys()),
    };
    const message = JSON.stringify(peerListMsg);
    for (const client of this.clients.values()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
    logInfo(`Broadcasted peer list: ${peerListMsg.peers.join(", ")}`);
  }
  public close() {
    this.wss.close();
    this.clients.clear();
    logInfo("Signaling server closed");
  }
}
