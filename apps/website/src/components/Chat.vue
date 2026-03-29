<script setup lang="ts">
import type { BubbleListProps, ConversationsProps } from "@antdv-next/x";
import type { XModelMessage, XModelParams, XModelResponse } from "@antdv-next/x-sdk";

import { SyncOutlined } from "@antdv-next/icons";
import {
  BubbleList,
  Sender,
  Welcome,
  Prompts,
  Conversations,
  CodeHighlighter,
  Mermaid,
} from "@antdv-next/x";
import { XMarkdown } from "@antdv-next/x-markdown";
import { XRequest, OpenAIChatProvider, useXChat } from "@antdv-next/x-sdk";
import { Button, Tooltip, Select } from "antdv-next";
import { computed, defineComponent, h, ref, watch, type VNode, type Component } from "vue";

import { aiService, type ModelInfo } from "../services/ai";

// 提取 VNode 中的文本内容
function extractText(nodes: VNode[]): string {
  return nodes
    .map((node) => {
      const children = node.children;
      if (typeof children === "string") return children;
      if (Array.isArray(children)) return extractText(children as VNode[]);
      return "";
    })
    .join("");
}

// 自定义代码渲染组件 - 处理代码高亮和 Mermaid 图表
const CodeRenderer = defineComponent({
  name: "CodeRenderer",
  setup(_, { attrs, slots }) {
    const lang = computed(() => {
      const dataLang = typeof attrs["data-lang"] === "string" ? attrs["data-lang"] : "";
      const dataLangCamel = typeof attrs.dataLang === "string" ? attrs.dataLang : "";
      const langAttr = typeof attrs.lang === "string" ? attrs.lang : "";
      const className = typeof attrs.class === "string" ? attrs.class : "";
      const classLang = className.match(/(?:^|\s)language-([^\s]+)/)?.[1] ?? "";
      return dataLang || dataLangCamel || langAttr || classLang;
    });

    const isBlock = computed(() => {
      const dataBlock = attrs["data-block"];
      const dataBlockCamel = attrs.dataBlock;
      const block = attrs.block;
      return (
        dataBlock === "true" ||
        dataBlock === true ||
        dataBlockCamel === "true" ||
        dataBlockCamel === true ||
        block === "true" ||
        block === true
      );
    });

    return () => {
      const code = extractText(slots.default?.() ?? []);

      // 行内代码不使用高亮
      if (!isBlock.value && !lang.value) {
        return h("code", code);
      }

      // Mermaid 图表渲染
      if (lang.value === "mermaid") {
        return h(Mermaid, {
          content: code,
        });
      }

      // 代码高亮渲染
      return h(CodeHighlighter, {
        content: code,
        language: lang.value || "text",
        showLineNumbers: true,
        showLanguage: true,
        showCopyButton: true,
      });
    };
  },
});

// 注册自定义组件
const markdownComponents: Record<string, Component> = {
  code: CodeRenderer,
};

interface ConversationItem {
  key: string;
  label: string;
  icon?: string;
  group?: string;
  messages: XModelMessage[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const models = ref<ModelInfo[]>([]);
const content = ref("");
const conversationsOpen = ref(true); // 默认打开侧边栏
const currentConversationKey = ref<string>("1");
const conversationList = ref<ConversationItem[]>([
  { key: "1", label: "新对话", icon: "💬", group: "今天", messages: [] },
]);
const currentModel = ref("qwen-plus");
const showWelcome = ref(true);

// 获取当前对话
const getCurrentConversation = () => {
  return conversationList.value.find((c) => c.key === currentConversationKey.value);
};

// 更新当前对话的消息
const updateCurrentConversationMessages = (newMessages: XModelMessage[]) => {
  const conv = conversationList.value.find((c) => c.key === currentConversationKey.value);
  if (conv) {
    conv.messages = newMessages;
    // 如果有消息，更新对话标题
    if (newMessages.length > 0 && conv.label === "新对话") {
      const firstUserMessage = newMessages.find((m) => m.message.role === "user");
      if (firstUserMessage) {
        const preview = firstUserMessage.message.content?.slice(0, 20) || "新对话";
        conv.label = preview + (firstUserMessage.message.content?.length > 20 ? "..." : "");
      }
    }
  }
};

// 创建新对话
const handleNewConversation = () => {
  const list = conversationList.value;
  const newKey = Date.now().toString();
  const newConversation: ConversationItem = {
    key: newKey,
    label: "新对话",
    icon: "💬",
    group: "今天",
    messages: [],
  };
  conversationList.value = [...list, newConversation];
  currentConversationKey.value = newKey;
  setMessages([]);
  showWelcome.value = true;
};

// 切换对话
const handleActiveChange: ConversationsProps["onActiveChange"] = (key) => {
  currentConversationKey.value = key;
  // 加载选中对话的消息
  const conv = getCurrentConversation();
  if (conv) {
    setMessages(conv.messages);
    showWelcome.value = conv.messages.length === 0;
  }
};

// 加载可用模型
const loadModels = async () => {
  try {
    const data = await aiService.getModels();
    models.value = data.providers;
  } catch (e) {
    console.error("Failed to load models:", e);
  }
};

loadModels();

// 创建 OpenAI 兼容的 provider
const createProvider = (model: string) => {
  return new OpenAIChatProvider({
    request: XRequest<XModelParams, XModelResponse>(`${API_BASE_URL}/api/chat/completions`, {
      manual: true,
      params: {
        model,
        stream: true,
      },
      streamTimeout: 60000,
    }),
  });
};

const provider = ref(createProvider(currentModel.value));

// 监听模型变化，重新创建 provider
watch(currentModel, (newModel) => {
  provider.value = createProvider(newModel);
});

// 获取当前对话的初始消息
const getInitialMessages = () => {
  const conv = getCurrentConversation();
  return conv?.messages || [];
};

// 使用 XChat hook
const {
  onRequest,
  messages,
  setMessages,
  setMessage,
  removeMessage,
  isRequesting,
  abort,
  onReload,
} = useXChat<XModelMessage, XModelMessage, XModelParams, XModelResponse>({
  provider: provider.value,
  defaultMessages: getInitialMessages(),
  typewriter: true, // 启用打字机效果
  requestFallback: (_, { error, errorInfo, messageInfo }) => {
    if (error.name === "AbortError") {
      return {
        content:
          typeof messageInfo?.message?.content === "string"
            ? messageInfo.message.content
            : "请求已中止",
        role: "assistant",
      };
    }

    return {
      content: errorInfo?.error?.message || "请求失败，请重试！",
      role: "assistant",
    };
  },
  requestPlaceholder: () => ({
    content: "请稍候...",
    role: "assistant",
  }),
});

// 监听消息变化，同步到对话列表
watch(
  messages,
  (newMessages) => {
    updateCurrentConversationMessages(newMessages);
    // 更新欢迎状态
    showWelcome.value = newMessages.length === 0;
  },
  { deep: true },
);

// 转换消息为 BubbleList 格式
const bubbleItems = computed(() =>
  messages.value.map(({ id, message, status }) => ({
    key: id,
    role: message.role,
    status,
    loading: status === "loading",
    content: message.content,
    footer:
      message.role === "assistant"
        ? () =>
            h(
              Tooltip,
              { title: "重试" },
              {
                default: () => [
                  h(Button, {
                    size: "small",
                    type: "text",
                    icon: h(SyncOutlined),
                    style: { marginInlineEnd: "auto" },
                    onClick: () => onReload(id, { userAction: "retry" }),
                  }),
                ],
              },
            )
        : undefined,
  })),
);

const roleConfig = computed<BubbleListProps["role"]>(() => ({
  assistant: {
    placement: "start" as const,
    contentRender: (value: string) =>
      h(XMarkdown, {
        content: value,
        components: markdownComponents,
        className: "x-markdown-light",
      }),
  },
  user: {
    placement: "end" as const,
  },
}));

const handlePromptClick = (info: { data: { description?: string } }) => {
  const prompt = typeof info.data.description === "string" ? info.data.description : "";
  if (!isRequesting.value && prompt) {
    showWelcome.value = false;
    handleSubmit(prompt);
  }
};

const handleChange = (value: string) => {
  content.value = value;
};

const handleSubmit = (nextContent: string) => {
  if (!nextContent || !nextContent.trim()) return;
  showWelcome.value = false;
  onRequest({
    messages: [
      {
        role: "user",
        content: nextContent,
      },
    ],
  });
  content.value = "";
};

const handleClear = () => {
  setMessages([]);
  updateCurrentConversationMessages([]);
  showWelcome.value = true;
};
</script>

<template>
  <div class="chat-layout">
    <!-- 侧边栏 - 对话列表 -->
    <div class="chat-sidebar" :class="{ open: conversationsOpen }">
      <Conversations
        :creation="{ onClick: handleNewConversation }"
        :items="conversationList"
        :active-key="currentConversationKey"
        :open="conversationsOpen"
        :groupable="true"
        @active-change="handleActiveChange"
        @open-change="conversationsOpen = $event"
      />
    </div>

    <!-- 主聊天区域 -->
    <div class="chat-main">
      <!-- 头部 -->
      <div class="chat-header">
        <button class="menu-toggle" @click="conversationsOpen = !conversationsOpen">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1>AI Chat</h1>
        <div class="model-selector">
          <Select
            v-model:value="currentModel"
            style="width: 180px"
            :options="models.flatMap((p) => p.models.map((m) => ({ label: m, value: m })))"
          />
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="messages-wrapper">
        <div v-if="showWelcome && messages.length === 0" class="welcome-container">
          <Welcome
            icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
            title="你好，我是你的 AI 助手"
            description="我可以帮助你回答问题、编写代码、创作文案等"
          />
          <div class="prompts-wrapper">
            <Prompts
              :items="[
                { key: '1', icon: '💡', description: '解释量子计算' },
                { key: '2', icon: '📝', description: '写一首关于春天的诗' },
                { key: '3', icon: '💻', description: '如何用 Vue 3 创建一个待办应用？' },
                { key: '4', icon: '🎨', description: '设计一个现代化的登录页面' },
              ]"
              @item-click="handlePromptClick"
            />
          </div>
        </div>

        <BubbleList
          v-else
          :style="{ height: '100%' }"
          :role="roleConfig"
          :items="bubbleItems"
          :auto-scroll="true"
          class="bubble-list"
        />
      </div>

      <!-- 输入区域 -->
      <div class="chat-footer">
        <Sender
          :loading="isRequesting"
          :value="content"
          placeholder="请输入内容，按下 Enter 发送消息 (Shift+Enter 换行)"
          :on-cancel="abort"
          :on-change="handleChange"
          :on-submit="handleSubmit"
        >
          <template #footer>
            <div class="sender-footer">
              <Button size="small" type="text" :disabled="!messages.length" @click="handleClear">
                清空对话
              </Button>
              <Button v-if="isRequesting" size="small" type="text" danger @click="abort">
                中止
              </Button>
            </div>
          </template>
        </Sender>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  background: #fff;
}

.chat-sidebar {
  width: 280px;
  border-right: 1px solid #f0f0f0;
  background: #fafafa;
  transition: transform 0.3s ease;
}

.chat-sidebar:not(.open) {
  display: none;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.menu-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  color: #666;
  transition: background 0.2s;
}

.menu-toggle:hover {
  background: #f5f5f5;
}

.chat-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.model-selector {
  margin-left: auto;
}

.messages-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 20px;
}

.welcome-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 24px;
}

.prompts-wrapper {
  max-width: 600px;
  width: 100%;
}

.bubble-list {
  max-width: 900px;
  margin: 0 auto;
}

.chat-footer {
  border-top: 1px solid #f0f0f0;
  padding: 16px 20px;
  background: #fff;
}

.chat-footer :deep(.x-sender) {
  max-width: 900px;
  margin: 0 auto;
}

.sender-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid #f5f5f5;
}

/* 滚动条样式 */
.messages-wrapper::-webkit-scrollbar {
  width: 6px;
}

.messages-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.messages-wrapper::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.messages-wrapper::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

/* XMarkdown 样式 */
.messages-wrapper :deep(.x-markdown-light) {
  font-size: 14px;
  line-height: 1.6;
}

.messages-wrapper :deep(.x-markdown-light p) {
  margin: 8px 0;
}

.messages-wrapper :deep(.x-markdown-light pre) {
  margin: 16px 0;
  padding: 0;
  background: transparent;
  border-radius: 0;
}

.messages-wrapper :deep(.x-markdown-light pre code) {
  display: block;
  padding: 0;
  overflow: visible;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  background: transparent;
}
</style>
