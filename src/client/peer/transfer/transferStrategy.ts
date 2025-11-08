/**
 * LocalBeam Transfer Strategy Interface
 * -------------------------------------
 * Defines the contract for all data transfer mechanisms.
 *
 * Each strategy is responsible for:
 *  - Establishing data channels between peers
 *  - Sending text messages, binary data, or files
 *  - Handling received payloads and invoking callbacks
 */

import type SimplePeer from "simple-peer";

export interface TransferContext {
  peer: SimplePeer.Instance;
  peerId: string;
}

/**
 * Base interface that all transfer strategies (direct, chunked, etc.)
 * must implement.
 */
export interface TransferStrategy {
  /**
   * Called when a new peer connection is established.
   * You can use this to set up listeners or prepare file streams.
   */
  attach(context: TransferContext): void;

  /**
   * Send a text message, binary buffer, or file.
   */
  send(data: string | ArrayBuffer | Blob): Promise<void>;

  /**
   * Handle data received from the remote peer.
   */
  onData(callback: (data: any, from: string) => void): void;

  /**
   * Clean up any listeners, streams, or intervals when a peer disconnects.
   */
  cleanup(): void;
}
