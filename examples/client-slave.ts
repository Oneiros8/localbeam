import { SignalingClient } from "../src/client/signaling/signalingClient";
import { SignalMessage } from "../src/shared/messageTypes";
import { logInfo, logWarn } from "../src/shared/utils/logger";

const slave = new SignalingClient("slave-1");

slave.on("open", () => {
  logInfo("✅ Slave connected to signaling server");
});

slave.on("message", (rawMsg) => {
  const msg = rawMsg as SignalMessage;
  logInfo("📩 Slave received message:", msg);

  if (msg.type === "offer" && msg.clientId) {
    const answerMsg: SignalMessage = {
      type: "answer",
      clientId: "slave-1",
      targetId: msg.clientId,
      payload: { sdp: "fake-answer-sdp" },
    };

    slave.send(answerMsg);
    logInfo("📤 Sent answer back to master-1");
  }
});

slave.on("error", (err) => logWarn("Slave WebSocket error:", err));

(async () => {
  await slave.connect();
})();

