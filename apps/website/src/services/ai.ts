export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  provider?: "qwen" | "openai";
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelInfo {
  name: string;
  models: string[];
}

export interface ModelsResponse {
  providers: ModelInfo[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const aiService = {
  /**
   * 获取支持的模型列表
   */
  async getModels(): Promise<ModelsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/models`);
    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }
    return response.json();
  },

  /**
   * 发送聊天请求（非流式）
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatMessage> {
    const response = await fetch(`${API_BASE_URL}/api/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        stream: false,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Chat request failed");
    }

    const data = await response.json();
    return {
      role: "assistant",
      content: data.choices?.[0]?.message?.content || "",
    };
  },

  /**
   * 发送流式聊天请求
   */
  async *chatStream(messages: ChatMessage[], options: ChatOptions = {}): AsyncGenerator<string> {
    const response = await fetch(`${API_BASE_URL}/api/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        stream: true,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Chat request failed");
    }

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
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                yield content;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
