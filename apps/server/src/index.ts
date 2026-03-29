import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import type { Request, Response } from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "localhost";

// AI Provider 配置
const AI_PROVIDERS = {
  qwen: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: process.env.QWEN_API_KEY,
    defaultModel: "qwen-plus",
  },
  openai: {
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: "gpt-3.5-turbo",
  },
};

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 获取当前配置的 AI 提供商
function getAiProvider(provider?: string) {
  // 优先使用 Qwen，如果没有配置则使用 OpenAI
  if (!provider) {
    if (AI_PROVIDERS.qwen.apiKey) {
      provider = "qwen";
    } else if (AI_PROVIDERS.openai.apiKey) {
      provider = "openai";
    } else {
      return null;
    }
  }

  const config = AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS];
  if (!config || !config.apiKey) {
    return null;
  }

  return {
    name: provider,
    ...config,
  };
}

// Chat API endpoint - OpenAI 兼容格式
app.post("/api/chat/completions", async (req: Request, res: Response) => {
  try {
    const { messages, stream = false, model, provider, ...otherParams } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: {
          message: "messages array is required",
          type: "invalid_request_error",
        },
      });
    }

    const aiProvider = getAiProvider(provider);

    if (!aiProvider) {
      return res.status(500).json({
        error: {
          message:
            "No AI provider configured. Please set QWEN_API_KEY or OPENAI_API_KEY in environment variables.",
          type: "server_error",
        },
      });
    }

    const selectedModel = model || aiProvider.defaultModel;

    console.log(`Using AI provider: ${aiProvider.name}, model: ${selectedModel}`);

    // Forward request to AI provider
    const response = await fetch(`${aiProvider.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiProvider.apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream,
        ...otherParams,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`AI provider error: ${errorData}`);
      throw new Error(`AI provider responded with status ${response.status}: ${errorData}`);
    }

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

// 获取支持的模型列表
app.get("/api/models", (req: Request, res: Response) => {
  const providers = [];

  if (AI_PROVIDERS.qwen.apiKey) {
    providers.push({
      name: "qwen",
      models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-max-longcontext"],
    });
  }

  if (AI_PROVIDERS.openai.apiKey) {
    providers.push({
      name: "openai",
      models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"],
    });
  }

  res.json({ providers });
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
