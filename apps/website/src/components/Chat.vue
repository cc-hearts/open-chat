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
import { computed, defineComponent, h, ref, watch, type Component, type VNode } from "vue";

import { aiService, type ModelInfo } from "../services/ai";
import ChatSidebar from "./chat/ChatSidebar.vue";
import ChatHeader from "./chat/ChatHeader.vue";
import ChatMessages from "./chat/ChatMessages.vue";
import ChatInput from "./chat/ChatInput.vue";

// ============ 类型定义 ============
interface ModelIconConfig {
  path: string;
  color: string;
}

// ============ 模型图标配置 ============

const MODEL_ICON_CONFIG: Record<string, ModelIconConfig> = {
  qwen: {
    path: "M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z",
    color: "#6B5CE7",
  },
  deepseek: {
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-4 4 4h-3v4h-2z",
    color: "#10B981",
  },
  doubao: {
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z",
    color: "#0EA5E9",
  },
  openai: {
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z",
    color: "#10A37F",
  },
  anthropic: {
    path: "M12 2L2 22h20L12 2zm0 4l6 12H6l6-12z",
    color: "#D97757",
  },
  gemini: {
    path: "M20.566 14.543c-.672 3.876-4.054 6.809-8.13 6.809-1.914 0-3.682-.568-5.168-1.542l-2.482 1.416c-.336.192-.752-.048-.752-.432v-2.928c0-.288.224-.528.512-.528h.384c.288 0 .512.24.512.528v1.68c1.296.768 2.8 1.2 4.384 1.2 3.312 0 6.048-2.4 6.528-5.568h-3.84c-.288 0-.528-.24-.528-.528v-2.4c0-.288.24-.528.528-.528h4.032c.24 0 .432.192.432.432v2.352c0 .048 0 .096-.048.144zM12.436 4.648c-3.312 0-6.048 2.4-6.528 5.568h10.368c-.48-3.168-3.216-5.568-6.528-5.568z",
    color: "#4285F4",
  },
};

// ============ 工具函数 ============

/**
 * 根据模型名称获取图标配置
 */
const getModelIconConfig = (modelName: string): ModelIconConfig => {
  const name = modelName.toLowerCase();
  if (name.includes("qwen")) return MODEL_ICON_CONFIG.qwen;
  if (name.includes("deepseek")) return MODEL_ICON_CONFIG.deepseek;
  if (name.includes("doubao")) return MODEL_ICON_CONFIG.doubao;
  if (name.includes("gpt") || name.includes("openai")) return MODEL_ICON_CONFIG.openai;
  if (name.includes("claude") || name.includes("anthropic")) return MODEL_ICON_CONFIG.anthropic;
  if (name.includes("gemini") || name.includes("google")) return MODEL_ICON_CONFIG.gemini;
  return MODEL_ICON_CONFIG.qwen;
};

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
 * 渲染图标 SVG
 */
const renderIcon = (iconConfig: ModelIconConfig, size: number = 20) =>
  h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: iconConfig.color || "currentColor",
      style: { display: "block" },
    },
    [h("path", { d: iconConfig.path, fill: iconConfig.color || "currentColor" })],
  );

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
      iconConfig: getModelIconConfig(m),
    })),
  );
});

const currentModelIconConfig = computed<ModelIconConfig>(() => {
  return getModelIconConfig(currentModel.value);
});

const modelDropdownItems = computed<MenuProps["items"]>(() => {
  return modelOptions.value.map((opt) => ({
    key: opt.value,
    label: opt.label,
    icon: renderIcon(opt.iconConfig, 16),
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

const prefixRender = () =>
  h(
    Dropdown,
    {
      menu: {
        items: modelDropdownItems.value,
        selectedKeys: [currentModel.value],
        onClick: handleModelChange,
      },
      trigger: ["click"],
    },
    {
      default: () =>
        h("div", { class: "model-selector" }, [
          h("div", { class: "model-icon-wrapper" }, renderIcon(currentModelIconConfig.value, 20)),
        ]),
    },
  );
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
        :prefix="prefixRender"
        @change="handleChange"
        @cancel="abort"
        @submit="handleSubmit"
      />
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
