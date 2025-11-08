import { PeerManager } from "../src/client/peer/peerManager";
import { SignalingClient } from "../src/client/signaling/signalingClient";
import { logInfo } from "../src/shared/utils/logger";

const signaling = new SignalingClient("slave-peer");
const peers = new PeerManager(signaling, "slave-peer");

signaling.connect();

peers.on("peer-list", (list: string[]) => {
  logInfo("📜 Peer list received:", list);
});

peers.on("peer-connected", (peerId: string) => {
  logInfo(`🔗 Connected to peer: ${peerId}`);

  // ✅ Respond once connection established
  setTimeout(() => {
    const msg = "Hi Master, message received ✅";
    peers.send(peerId, msg);
    logInfo(`📤 Sent message to ${peerId}: "${msg}"`);
  }, 2000);
});

peers.on("data", (from: string, data: any) => {
  logInfo(`📩 Data received from ${from}:`, data);
});
