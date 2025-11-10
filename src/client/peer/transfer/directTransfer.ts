/**
 * DirectTransfer Strategy
 * ------------------------
 * This is the simplest transfer mode — it directly sends data over
 * the WebRTC data channel (SimplePeer's `peer.send()`).
 *
 * Suitable for:
 *  - Text messages
 *  - Small files or JSON payloads
 *
 * Not suitable for:
 *  - Large files (>16MB) — for that, use a chunked/streaming strategy.
 */

import type SimplePeer from "simple-peer";
import { TransferStrategy, TransferContext } from "./transferStrategy";
import { logInfo, logWarn, logError } from "../../../shared/utils/logger";

export class DirectTransfer implements TransferStrategy {
  private peer: SimplePeer.Instance | null = null;
  private peerId: string = "";
  private onDataCallback: ((data: any, from: string) => void) | null = null;

  attach(context: TransferContext): void {
    this.peer = context.peer;
    this.peerId = context.peerId;

    logInfo(`DirectTransfer attached to peer: ${this.peerId}`);

    // Listen for incoming data
    this.peer.on("data", (data: Uint8Array) => {
      try {
        const decoded = this.decodeData(data);
        logInfo(`Received data from ${this.peerId}:`, decoded);
        this.onDataCallback?.(decoded, this.peerId);
      } catch (err) {
        logError("Failed to process incoming data", err);
      }
    });

    // Handle peer close
    this.peer.on("close", () => {
      logWarn(`Connection closed for peer ${this.peerId}`);
      this.cleanup();
    });
  }

  async send(data: string | ArrayBuffer | Blob): Promise<void> {
    if (!this.peer || !this.peer.connected) {
      logWarn(`Peer ${this.peerId} not connected — skipping send`);
      return;
    }

    try {
      const encoded = await this.encodeData(data);
      this.peer.send(encoded);
      logInfo(`Sent data to ${this.peerId}`);
    } catch (err) {
      logError("Failed to send data", err);
    }
  }

  onData(callback: (data: any, from: string) => void): void {
    this.onDataCallback = callback;
  }

  cleanup(): void {
    this.peer = null;
    this.onDataCallback = null;
  }

  private async encodeData(data: any): Promise<ArrayBuffer | string> {
    if (typeof data === "string") return data;
    if (data instanceof ArrayBuffer) return data;
    if (data instanceof Blob) return await data.arrayBuffer();

    if (typeof data === "object") {
      return JSON.stringify(data);
    }

    throw new Error("Unsupported data type");
  }


  private decodeData(data: Uint8Array): any {
    try {
      const text = new TextDecoder("utf-8").decode(data);
      try {
        const parsed = JSON.parse(text);
        if (parsed?.type === "file" && parsed.data) {
          return parsed;
        }
        return parsed;
      } catch {
        return text;
      }
    } catch {
      return data;
    }
  }
}
