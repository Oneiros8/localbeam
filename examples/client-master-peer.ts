import { PeerManager } from "../src/client/peer/peerManager";
import { SignalingClient } from "../src/client/signaling/signalingClient";
import { logInfo } from "../src/shared/utils/logger";

const signaling = new SignalingClient("master-peer");
const peers = new PeerManager(signaling, "master-peer");

signaling.connect();

peers.on("peer-list", (list: string[]) => {
  logInfo("📜 Peer list received:", list);
  list
    .filter((id) => id !== "master-peer")
    .forEach((peerId) => {
      logInfo(`📡 Connecting to ${peerId}`);
      peers.createConnection(peerId);
    });
});

peers.on("peer-connected", (peerId: string) => {
  logInfo(`🔗 Connected to peer: ${peerId}`);

  // ✅ Send a test message using the DirectTransfer strategy
  setTimeout(() => {
    const msg = "Hello from Master 👋";
    peers.send(peerId, msg);
    logInfo(`📤 Sent message to ${peerId}: "${msg}"`);
  }, 1000);
});

peers.on("data", (from: string, data: any) => {
  logInfo(`📩 Data received from ${from}:`, data);
});
