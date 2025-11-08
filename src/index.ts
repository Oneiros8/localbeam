/**
 * LocalBeam
 * ----------
 * Lightweight local network peer discovery and data transfer library
 * built on WebRTC + Bonjour.
 *
 * This file serves as the main public API entrypoint.
 */

if (typeof globalThis.global === "undefined") {
  (globalThis as any).global = globalThis;
}

export { PeerManager } from "./client/peer/peerManager";
export { SignalingClient } from "./client/signaling/signalingClient";
export { DirectTransfer } from "./client/peer/transfer/directTransfer";

export { logInfo, logWarn, logError } from "./shared/utils/logger";

export * from "./shared/messageTypes";
