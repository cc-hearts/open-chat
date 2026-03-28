import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import type { Request, Response } from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "localhost";

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Chat API endpoint - OpenAI compatible
app.post("/api/chat/completions", async (req: Request, res: Response) => {
  try {
    const { messages, stream = false, ...otherParams } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: {
          message: "messages array is required",
          type: "invalid_request_error",
        },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

    if (!apiKey) {
      return res.status(500).json({
        error: {
          message: "OPENAI_API_KEY not configured",
          type: "server_error",
        },
      });
    }

    // Forward request to AI provider
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages,
        stream,
        ...otherParams,
      }),
    });

    if (stream) {
      // Handle streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          res.write(chunk);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      // Handle non-streaming response
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      error: {
        message: error instanceof Error ? error.message : "Internal server error",
        type: "server_error",
      },
    });
  }
});

// Start server
const server = createServer(app);

server.listen(Number(PORT), HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`Chat API: http://${HOST}:${PORT}/api/chat/completions`);
});

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
