import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleAIPrioritize } from "./routes/ai-prioritize";
import { handleToddAssistant } from "./routes/todd-assistant";

// Force override OPENAI_API_KEY with the latest value
process.env.OPENAI_API_KEY = "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";
console.log("OPENAI_API_KEY set to:", process.env.OPENAI_API_KEY?.slice(-10));

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/ai-prioritize", handleAIPrioritize);
  app.post("/api/todd-assistant", handleToddAssistant);

  return app;
}
