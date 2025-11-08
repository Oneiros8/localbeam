import { Express } from "express";
import http, { Server as HttpServer } from "http";

export type LocalBeamServerOptions = {
  port?: number;
  app?: Express;
  server?: HttpServer;
  serviceName?: string;
};
