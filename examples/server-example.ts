/**
 * Example: Running a LocalBeam signaling server
 *
 * This example shows how simple it is to start the server with Bonjour
 * discovery and WebSocket signaling using the localbeam package.
 */

import express from "express";
import { createLocalBeamServer } from "../src/server/index"; // when published, this becomes `import { createLocalBeamServer } from "localbeam"`

// Create a simple Express app (optional — you can pass your own)
const app = express();

// Optional: Add your own routes or middleware
app.get("/", (_req, res) => {
  res.send("LocalBeam server is running!");
});

// Initialize and start the LocalBeam server
const server = createLocalBeamServer({
  app,                       // custom express app
  port: 5000,                // default: 5000
  serviceName: "LocalBeam Signaling Server", // Bonjour name
});

// Optional: Graceful shutdown on Ctrl+C
process.on("SIGINT", () => {
  console.log("\nShutting down LocalBeam server...");
  server.stop();
  process.exit(0);
});
