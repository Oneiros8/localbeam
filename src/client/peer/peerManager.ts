// @ts-ignore
import SimplePeer from "simple-peer/simplepeer.min.js";
import { SignalMessage, PeerListMessage } from "../../shared/messageTypes";
import { logInfo, logWarn, logError } from "../../shared/utils/logger";
import EventEmitter from "eventemitter3";
import { SignalingClient } from "../signaling/signalingClient";
import { DirectTransfer } from "../peer/transfer/directTransfer";
import type { TransferContext } from "../peer/transfer/transferStrategy";
import type { PeerManagerEvents } from "./types";

let wrtc: any = undefined;
if (typeof window === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    wrtc = require("wrtc");
    logInfo("Loaded wrtc for Node.js WebRTC support");
  } catch (err) {
    logWarn(
      "wrtc not installed. P2P will fail in Node environments without it."
    );
  }
}

export class PeerManager extends EventEmitter<PeerManagerEvents> {
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private transfers: Map<string, DirectTransfer> = new Map();
  private connectedPeers: Set<string> = new Set();
  private signaling: SignalingClient;
  private clientId: string;

  constructor(signaling: SignalingClient, clientId: string) {
    super();
    this.signaling = signaling;
    this.clientId = clientId;
    this.setupSignalingHandlers();
  }

  /** -------------------- SIGNALING -------------------- */
  private setupSignalingHandlers() {
    this.signaling.on("message", async (msg: SignalMessage) => {
      switch (msg.type) {
        case "peer-list": {
          const peerListMsg = msg as PeerListMessage;
          const unique = Array.from(new Set(peerListMsg.peers));
          logInfo("Updated peer list:", unique);
          this.emit("peer-list", unique);
          break;
        }

        case "offer":
          await this.handleOffer(msg);
          break;

        case "answer":
          await this.handleAnswer(msg);
          break;

        case "candidate":
          await this.handleCandidate(msg);
          break;

        default:
          logWarn("Unknown signaling message:", msg);
      }
    });
  }

  /** -------------------- HANDLERS -------------------- */
  private async handleOffer(msg: SignalMessage) {
    const peerId = msg.clientId;
    if (!peerId) return logWarn("Offer missing clientId");

    if (this.peers.has(peerId)) {
      const existing = this.peers.get(peerId)!;
      if (msg.payload) existing.signal(msg.payload);
      return;
    }

    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      ...(wrtc ? { wrtc } : {}),
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        iceTransportPolicy: "all",
      },
    });

    this.setupPeerEvents(peerId, peer);
    this.registerPeer(peerId, peer);

    peer.on("signal", (data: any) => {
      const answerMsg: SignalMessage = {
        type: "answer",
        clientId: this.clientId,
        targetId: peerId,
        payload: data,
      };
      this.signaling.send(answerMsg);
    });

    if (msg.payload) peer.signal(msg.payload);
  }

  private async handleAnswer(msg: SignalMessage) {
    const peerId = msg.clientId;
    if (!peerId) return logWarn("Answer missing clientId");

    const peer = this.peers.get(peerId);
    if (!peer) return logWarn(`No peer found for ${peerId}`);

    if (msg.payload) peer.signal(msg.payload);
  }

  private async handleCandidate(msg: SignalMessage) {
    const peerId = msg.clientId;
    if (!peerId) return;

    const peer = this.peers.get(peerId);
    if (!peer) return logWarn(`Candidate: no peer found for ${peerId}`);

    if (msg.payload) peer.signal(msg.payload);
  }

  /** -------------------- CONNECTION CREATION -------------------- */
  public createConnection(peerId: string) {
    if (this.peers.has(peerId)) {
      logInfo(`Peer ${peerId} already exists; skipping createConnection`);
      return;
    }

    logInfo(`📡 Creating connection to ${peerId}`);
    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      ...(wrtc ? { wrtc } : {}),
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        iceTransportPolicy: "all",
      },
    });

    this.setupPeerEvents(peerId, peer);
    this.registerPeer(peerId, peer);

    peer.on("signal", (data: any) => {
      const offerMsg: SignalMessage = {
        type: "offer",
        clientId: this.clientId,
        targetId: peerId,
        payload: data,
      };
      this.signaling.send(offerMsg);
    });
  }

  /** -------------------- EVENT WIRING -------------------- */
  private setupPeerEvents(peerId: string, peer: SimplePeer.Instance) {
    peer.on("error", (err: any) => {
      logWarn(`Peer error (${peerId}):`, err);
      this.connectedPeers.delete(peerId);
      this.cleanupPeer(peerId);
    });

    peer.on("close", () => {
      logWarn(`🔌 Peer connection closed: ${peerId}`);
      this.connectedPeers.delete(peerId);
      this.cleanupPeer(peerId);
    });

    peer.on("connect", () => {
      logInfo(`Connected to peer ${peerId}`);
      this.connectedPeers.add(peerId);

      //Attach DirectTransfer
      const transfer = new DirectTransfer();
      const context: TransferContext = { peer, peerId };
      transfer.attach(context);

      transfer.onData((data, from) => {
        this.emit("data", from, data);
      });

      this.transfers.set(peerId, transfer);
      this.emit("peer-connected", peerId);
    });
  }

  /** -------------------- UTILITIES -------------------- */
  private registerPeer(peerId: string, peer: SimplePeer.Instance) {
    this.peers.set(peerId, peer);
    logInfo(`Peer registered: ${peerId}`);
  }

  /** Send via attached DirectTransfer */
  public async send(peerId: string, data: string | ArrayBuffer | Blob) {
    const transfer = this.transfers.get(peerId);
    if (!transfer) {
      logWarn(`No transfer strategy found for ${peerId}. Message not sent.`);
      return;
    }

    await transfer.send(data);
  }

  /** Graceful peer cleanup */
  private cleanupPeer(peerId: string) {
    const transfer = this.transfers.get(peerId);
    if (transfer) {
      transfer.cleanup();
      this.transfers.delete(peerId);
    }

    const peer = this.peers.get(peerId);
    if (peer) {
      try {
        peer.destroy();
      } catch (e) {}
      this.peers.delete(peerId);
    }

    this.connectedPeers.delete(peerId);
  }

  /** Close all peer connections */
  public closeAll() {
    this.peers.forEach((_, id) => this.cleanupPeer(id));
    logInfo("Closed all peer connections.");
  }
}
