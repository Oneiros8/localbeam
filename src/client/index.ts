/**
 * LocalBeam Client SDK
 * ---------------------
 * Exports everything developers need to:
 * - Discover signaling servers (via /discover or Bonjour)
 * - Connect and exchange WebRTC signals
 * - Manage P2P connections and send data/messages
 */

export {
  SignalingClient,
  SignalingClientOptions,
} from "./signaling/signalingClient";
export { PeerManager } from "./peer/peerManager";

// Shared types
export type { SignalMessage, SignalType } from "../shared/messageTypes";
