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
};
