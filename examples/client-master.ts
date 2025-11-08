import { SignalingClient } from "../src/client/signaling/signalingClient";
import { SignalMessage } from "../src/shared/messageTypes";
import { logInfo } from "../src/shared/utils/logger";

const master = new SignalingClient("master-1");

master.on("open", () => {
  logInfo("✅ Master connected to signaling server");
});

master.on("message", (msg) => {
  logInfo("📩 Master received message:", msg);

  if (msg.type === "peer-list") {
    // Send offer to any new peer except self
    msg.peers
      .filter((peerId: string) => peerId !== "master-1")
      .forEach((peerId: string) => {
        const offerMsg: SignalMessage = {
          type: "offer",
          clientId: "master-1",
          targetId: peerId,
          payload: { sdp: "fake-offer-sdp" },
        };
        master.send(offerMsg);
        logInfo(`📤 Sent offer to ${peerId}`);
      });
  }

  if (msg.type === "answer") {
    logInfo("✅ Master received answer from slave:", msg);
  }
});

master.connect();
