<template>
  <div class="chat-container">
    <header class="chat-header">
      <h1>Open Chat</h1>
      <p class="subtitle">AI-Powered Chat Assistant</p>
    </header>

    <main class="chat-main">
      <div class="messages-container" ref="messagesContainer">
        <div
          v-for="message in renderedMessages"
          :key="message.id"
          :class="['message', message.status, message.message.role || 'assistant']"
        >
          <div class="message-avatar">
            <span v-if="message.message.role === 'user'">👤</span>
            <span v-else>🤖</span>
          </div>
          <div class="message-content">
            <div class="message-text">{{ message.message.content }}</div>
            <div v-if="message.status === 'loading'" class="loading-indicator">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
            <div v-if="message.status === 'error'" class="error-message">
              Failed to get response. Please try again.
            </div>
          </div>
        </div>

        <div v-if="renderedMessages.length === 0" class="welcome-message">
          <h2>Welcome to Open Chat!</h2>
          <p>Start a conversation by typing a message below.</p>
        </div>
      </div>
    </main>

    <footer class="chat-footer">
      <form @submit.prevent="handleSubmit" class="input-form">
        <textarea
          v-model="inputMessage"
          placeholder="Type your message..."
          :disabled="isRequesting"
          @keydown.enter.exact.prevent="handleEnterKey"
          rows="1"
          ref="textareaRef"
        ></textarea>
        <button type="submit" :disabled="!inputMessage.trim() || isRequesting" class="send-button">
          <svg
            v-if="!isRequesting"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          <span v-else class="loading-spinner"></span>
        </button>
      </form>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { XRequest, OpenAIChatProvider, useXChat } from "@antdv-next/x-sdk";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const inputMessage = ref("");
const messagesContainer = ref<HTMLDivElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Create OpenAI-compatible provider
const provider = new OpenAIChatProvider<ChatMessage>({
  request: XRequest("/api/chat/completions", {
    params: {
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      stream: true,
    },
    streamTimeout: 60000,
  }),
});

// Use XChat hook
const { messages, parsedMessages, isRequesting, isDefaultMessagesRequesting, onRequest } = useXChat(
  {
    provider,
    defaultMessages: [],
    parser: (message) => message,
    requestPlaceholder: { role: "assistant", content: "" },
  },
);

const renderedMessages = computed(() => {
  return parsedMessages.value || messages.value;
});

// Auto-scroll to bottom when new messages arrive
watch(
  () => renderedMessages.value.length,
  async () => {
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  },
);

// Auto-resize textarea
watch(inputMessage, () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";
    textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 200)}px`;
  }
});

const handleSubmit = () => {
  const content = inputMessage.value.trim();
  if (!content || isRequesting.value) return;

  const userMessage: ChatMessage = {
    role: "user",
    content,
  };

  onRequest({ messages: [userMessage] });
  inputMessage.value = "";

  // Reset textarea height
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto";
  }
};

const handleEnterKey = () => {
  handleSubmit();
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.chat-header {
  padding: 20px;
  text-align: center;
  color: white;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.chat-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.subtitle {
  margin: 5px 0 0;
  font-size: 14px;
  opacity: 0.9;
}

.chat-main {
  flex: 1;
  overflow: hidden;
  padding: 20px;
}

.messages-container {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message-avatar {
  font-size: 24px;
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message.user .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 12px 16px;
  border-radius: 16px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.message.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-text {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

.loading-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #9ca3af;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  padding: 8px 12px;
  background: #fee2e2;
  border-radius: 8px;
}

.welcome-message {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.welcome-message h2 {
  margin: 0 0 10px;
  color: #374151;
}

.chat-footer {
  padding: 20px;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.input-form {
  display: flex;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 12px 16px;
  border-radius: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 16px;
  line-height: 1.5;
  font-family: inherit;
  max-height: 200px;
  min-height: 24px;
}

textarea:disabled {
  background: #f3f4f6;
}

.send-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition:
    transform 0.2s,
    opacity 0.2s;
  flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Scrollbar styling */
.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>
