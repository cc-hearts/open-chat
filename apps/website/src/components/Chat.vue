<script setup lang="ts">
import type {
  BubbleItemType,
  BubbleListProps,
  ConversationItemType,
  ConversationsProps,
} from "@antdv-next/x";
import type { DefaultMessageInfo } from "@antdv-next/x-sdk";
import type { XModelMessage, XModelParams, XModelResponse } from "@antdv-next/x-sdk";
import { SyncOutlined } from "@antdv-next/icons";
import { CodeHighlighter, Mermaid } from "@antdv-next/x";
import { XMarkdown } from "@antdv-next/x-markdown";
import { XRequest, OpenAIChatProvider, useXChat } from "@antdv-next/x-sdk";
import { Button, Tooltip, Dropdown, type MenuProps } from "antdv-next";
import { computed, ref, watch, defineComponent, h } from "vue";
import type { Component, VNode } from "vue";
import { aiService, type ModelInfo } from "../services/ai";
import ChatSidebar from "./chat/ChatSidebar.vue";
import ChatHeader from "./chat/ChatHeader.vue";
import ChatMessages from "./chat/ChatMessages.vue";
import ChatInput from "./chat/ChatInput.vue";
import ModelIcon from "./Icons/ModelIcon.vue";

// ============ 工具函数 ============

/**
 * 提取 VNode 中的文本内容
 */
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

/**
 * 渲染模型图标
 */
const renderModelIcon = (model: string, size: number = 20) =>
  h(ModelIcon, {
    model,
    size,
  });

// ============ 自定义代码渲染组件 ============

const CodeRenderer = defineComponent({
  name: "CodeRenderer",
  inheritAttrs: false,
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

      if (!isBlock.value && !lang.value) {
        return h("code", code);
      }

      if (lang.value === "mermaid") {
        return h(Mermaid, { content: code });
      }

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

const markdownComponents: Record<string, Component> = {
  code: CodeRenderer,
};

// ============ 常量定义 ============

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ============ 响应式状态 ============

const models = ref<ModelInfo[]>([]);
const content = ref("");
const conversationsOpen = ref(true);
const currentConversationKey = ref<string>("1");
const currentModel = ref("qwen-plus");
const showWelcome = ref(true);

const conversationList = ref<ConversationItemType[]>([
  {
    key: "1",
    label: "默认对话",
    icon: "💬",
    group: "今天",
    messages: [],
  },
]);

// ============ 计算属性 ============

const modelOptions = computed(() => {
  return models.value.flatMap((p) =>
    p.models.map((m) => ({
      label: m,
      value: m,
    })),
  );
});

const modelDropdownItems = computed<MenuProps["items"]>(() => {
  return modelOptions.value.map((opt) => ({
    key: opt.value,
    label: opt.label,
    icon: renderModelIcon(opt.value, 16),
  }));
});

// ============ 对话管理 ============

const getCurrentConversation = (): ConversationItemType | undefined => {
  return conversationList.value.find((c) => c.key === currentConversationKey.value);
};

const updateCurrentConversationMessages = (newMessages: DefaultMessageInfo<XModelMessage>[]) => {
  const conv = conversationList.value.find((c) => c.key === currentConversationKey.value);
  if (!conv) return;

  conv.messages = newMessages;

  // 如果有消息，更新对话标题
  if (newMessages.length > 0 && conv.label === "新对话") {
    const firstUserMessage = newMessages.find((m) => m.message.role === "user");
    if (firstUserMessage) {
      const contentStr =
        typeof firstUserMessage.message.content === "string"
          ? firstUserMessage.message.content
          : "";
      const preview = contentStr.slice(0, 20) || "新对话";
      conv.label = preview + (contentStr.length > 20 ? "..." : "");
    }
  }
};

const handleNewConversation = () => {
  const newKey = Date.now().toString();
  const newConversation: ConversationItemType = {
    key: newKey,
    label: "新对话",
    icon: "💬",
    group: "今天",
    messages: [],
  };
  conversationList.value.push(newConversation);
  currentConversationKey.value = newKey;
  setMessages([]);
  showWelcome.value = true;
};

const handleActiveChange: ConversationsProps["onActiveChange"] = (key) => {
  currentConversationKey.value = key;
  const conv = getCurrentConversation();
  if (conv) {
    setMessages(conv.messages);
    showWelcome.value = conv.messages.length === 0;
  }
};

const handleSidebarToggle = () => {
  conversationsOpen.value = !conversationsOpen.value;
};

// ============ 模型加载 ============

const loadModels = async () => {
  try {
    const data = await aiService.getModels();
    models.value = data.providers;
  } catch (e) {
    console.error("Failed to load models:", e);
  }
};

loadModels();

// ============ XChat 配置 ============

const createProvider = (model: string) => {
  return new OpenAIChatProvider({
    request: XRequest<XModelParams, XModelResponse>(`${API_BASE_URL}/api/chat/completions`, {
      manual: true,
      params: { model, stream: true },
      streamTimeout: 60000,
    }),
  });
};

let provider = createProvider(currentModel.value);

const getInitialMessages = (): DefaultMessageInfo<XModelMessage>[] => {
  const conv = getCurrentConversation();
  return conv?.messages || [];
};

// 监听模型变化，重新创建 provider
watch(currentModel, (newModel) => {
  provider = createProvider(newModel);
});

const { onRequest, messages, setMessages, isRequesting, abort, onReload } = useXChat<
  XModelMessage,
  XModelMessage,
  XModelParams,
  XModelResponse
>({
  provider: provider,
  defaultMessages: getInitialMessages,
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
  requestPlaceholder: () => ({ content: "请稍候...", role: "assistant" }),
});

// 监听消息变化，同步到对话列表
watch(
  messages,
  (newMessages) => {
    updateCurrentConversationMessages(newMessages);
    showWelcome.value = newMessages.length === 0;
  },
  { deep: true },
);

// ============ 消息转换 ============

const bubbleItems = computed<BubbleItemType[]>(() =>
  messages.value.map(({ id, message, status }) => ({
    key: id,
    role: message.role,
    status,
    loading: status === "loading",
    content: typeof message.content === "string" ? message.content : "",
    footer:
      message.role === "assistant" && status !== "loading"
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
  user: { placement: "end" as const },
}));

// ============ 事件处理 ============

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
    messages: [{ role: "user", content: nextContent }],
  });
  // 清空输入框
  setTimeout(() => {
    content.value = "";
  }, 0);
};

const handleModelChange: MenuProps["onClick"] = ({ key }) => {
  currentModel.value = key as string;
};
</script>

<template>
  <div class="chat-layout">
    <!-- 左侧边栏 - 对话列表 -->
    <ChatSidebar
      v-model:open="conversationsOpen"
      :conversation-list="conversationList"
      :current-key="currentConversationKey"
      @new-conversation="handleNewConversation"
      @active-change="handleActiveChange"
    />

    <!-- 主聊天区域 -->
    <div class="chat-main">
      <!-- 头部 -->
      <ChatHeader @toggle-sidebar="handleSidebarToggle" />

      <!-- 消息列表区域（上下布局） -->
      <ChatMessages
        :show-welcome="showWelcome && messages.length === 0"
        :bubble-items="bubbleItems"
        :role-config="roleConfig"
        @prompt-click="handlePromptClick"
      />

      <!-- 输入区域 -->
      <ChatInput
        v-model="content"
        :loading="isRequesting"
        @change="handleChange"
        @cancel="abort"
        @submit="handleSubmit"
      >
        <template #prefix>
          <Dropdown
            :menu="{
              items: modelDropdownItems,
              selectedKeys: [currentModel],
              onClick: handleModelChange,
            }"
            :trigger="['click']"
          >
            <div class="model-selector">
              <div class="model-icon-wrapper">
                <ModelIcon :model="currentModel" :size="20" />
              </div>
            </div>
          </Dropdown>
        </template>
      </ChatInput>
    </div>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  background: #fff;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
