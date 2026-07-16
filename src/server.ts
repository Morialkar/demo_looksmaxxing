import Fastify from "fastify";
import { workflowRoutes } from "./routes/workflow.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(workflowRoutes);
  return app;
}
