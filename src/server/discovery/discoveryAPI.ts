import { Express } from "express";
import bonjour from "bonjour";
import { logInfo, logError, logWarn } from "../../shared/utils/logger";

export function registerDiscoveryRoute(
  app: Express,
  serviceName: string = "LocalBeam Signaling Server"
) {
  app.get("/discover", async (_req, res) => {
    logInfo("Discovery request received — searching for Bonjour services...");

    const browser = bonjour().find({ type: "http" });
    let resolved = false;

    browser.on("up", (service) => {
      if (service.name === serviceName && !resolved) {
        resolved = true;
        const address = service?.referer?.address || "127.0.0.1";
        logInfo(`Found signaling service: ${address}:${service.port}`);
        res.json({ url: `ws://${address}:${service.port}` });
        browser.stop();
      }
    });

    setTimeout(() => {
      if (!resolved) {
        logWarn("No Bonjour service found, defaulting to localhost.");
        res.json({ url: `ws://localhost:5000` });
        browser.stop();
      }
    }, 3000);
  });
  logInfo("/discover route registered.");
}
