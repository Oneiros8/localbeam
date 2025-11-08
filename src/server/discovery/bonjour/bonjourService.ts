import bonjour, { Bonjour, Service } from "bonjour";
import { logInfo, logError } from "../../../shared/utils/logger";
import { BonjourConfig } from "./types";

let bonjourInstance: Bonjour | null = null;
let publishedService: Service | null = null;

export class BonjourService {
  private bonjourInstance: Bonjour | null = null;
  private publishedService: Service | null = null;
  private config: BonjourConfig;

  constructor(config: BonjourConfig) {
    this.config = config;
  }

  start() {
    try {
      this.bonjourInstance = bonjour();
      this.publishedService = this.bonjourInstance.publish({
        name: this.config.name || "LocalBeam Signaling Server",
        type: this.config.type || "http",
        port: this.config.port,
      });

      this.publishedService.on("up", () => {
        logInfo(`Bonjour service published: ${this.config.name}`);
      });

      this.publishedService.on("error", (err) => {
        logError("Bonjour service error:", err);
      });
    } catch (err) {
      logError("Failed to start Bonjour service:", err);
    }
  }

  stop() {
    try {
      if (this.publishedService) {
        this.publishedService.stop();
        logInfo("Bonjour service stopped");
      }
      if (this.bonjourInstance) {
        this.bonjourInstance.destroy();
        this.bonjourInstance = null;
      }
    } catch (err) {
      logError("Error while stopping Bonjour service:", err);
    }
  }
}
