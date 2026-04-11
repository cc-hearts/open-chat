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
import { CodeHighlighter, Mermaid, Think } from "@antdv-next/x";
import { XMarkdown } from "@antdv-next/x-markdown";
import { DeepSeekChatProvider, XRequest, useXChat } from "@antdv-next/x-sdk";
import { Button, Tooltip, message, type MenuProps } from "antdv-next";
import { computed, ref, watch, defineComponent, h, onMounted, onBeforeUnmount } from "vue";
import type { Component, VNode } from "vue";
import { aiService, type ModelInfo } from "../services/ai";
import {
  clearChatState,
  loadChatState,
  normalizePersistedChatState,
  saveChatState,
  type PersistedChatState,
  type PersistedConversation,
} from "../services/chatStorage";
import ChatSidebar from "./chat/ChatSidebar.vue";
import ChatHeader from "./chat/ChatHeader.vue";
import ChatMessages from "./chat/ChatMessages.vue";
import ChatInput from "./chat/ChatInput.vue";

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

interface ParsedThinkContent {
  thinkContent: string;
  answerContent: string;
  thinkDone: boolean;
}

const parseThinkContent = (value: string): ParsedThinkContent | null => {
  const openMatch = value.match(/<think(?:\s+status=["']?([^"'>\s]+)["']?)?>/i);
  if (!openMatch || openMatch.index === undefined) {
    return null;
  }

  const openTag = openMatch[0];
  const status = (openMatch[1] || "").toLowerCase();
  const thinkStart = openMatch.index + openTag.length;
  const closeTag = "</think>";
  const closeIndex = value.indexOf(closeTag, thinkStart);

  const prefix = value.slice(0, openMatch.index).trim();
  const thinkRaw =
    closeIndex === -1 ? value.slice(thinkStart) : value.slice(thinkStart, closeIndex);
  const suffix = closeIndex === -1 ? "" : value.slice(closeIndex + closeTag.length).trim();

  const thinkContent = thinkRaw.replace(/^\n+/, "").trim();
  const answerContent = [prefix, suffix].filter(Boolean).join("\n\n").trim();
  const thinkDone = closeIndex !== -1 || status === "done";

  return {
    thinkContent,
    answerContent,
    thinkDone,
  };
};

const renderMarkdown = (value: string) =>
  h(XMarkdown, {
    content: value,
    components: markdownComponents,
    className: "x-markdown-light",
  });

// ============ 常量定义 ============

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ============ 响应式状态 ============

const models = ref<ModelInfo[]>([]);
const content = ref("");
const conversationsOpen = ref(true);
const currentConversationKey = ref<string>("");
const currentModel = ref("qwen-plus");
const thinkingEnabled = ref(true);
const showWelcome = ref(true);
const isHydrating = ref(true);
const thinkExpandedMap = ref<Record<string, boolean>>({});
const thinkDoneMap = ref<Record<string, boolean>>({});
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const getMessagePreview = (content: string, maxLength: number = 20): string => {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "新对话";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const createNewConversation = (): ConversationItemType => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: "新对话",
  icon: "💬",
  group: "今天",
  messages: [],
});

const conversationList = ref<ConversationItemType[]>([]);

const toPersistedConversations = (list: ConversationItemType[]): PersistedConversation[] => {
  return list
    .filter((conversation) => {
      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      return messages.length > 0;
    })
    .map((conversation, index) => {
      const normalizedLabel =
        typeof conversation.label === "string" && conversation.label.trim()
          ? conversation.label
          : "新对话";
      const normalizedIcon = typeof conversation.icon === "string" ? conversation.icon : "💬";
      const normalizedGroup = typeof conversation.group === "string" ? conversation.group : "今天";

      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const normalizedMessages = messages.map((item, messageIndex) => {
        const fallbackId = `${Date.now()}-${index}-${messageIndex}`;
        return {
          id: item.id ?? fallbackId,
          status: item.status,
          message:
            typeof item.message === "object" && item.message !== null
              ? { ...item.message }
              : ({ role: "assistant", content: String(item.message ?? "") } as XModelMessage),
          ...(item.extraInfo ? { extraInfo: item.extraInfo } : {}),
        };
      });

      return {
        key: String(conversation.key),
        label: normalizedLabel,
        icon: normalizedIcon,
        group: normalizedGroup,
        messages: normalizedMessages,
      };
    });
};

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
  }));
});

// ============ 对话管理 ============

const getCurrentConversation = (): ConversationItemType | undefined => {
  return conversationList.value.find((c) => c.key === currentConversationKey.value);
};

const isInDraftMode = computed(() => !currentConversationKey.value);

const updateCurrentConversationMessages = (newMessages: DefaultMessageInfo<XModelMessage>[]) => {
  const conv = conversationList.value.find((c) => c.key === currentConversationKey.value);
  if (!conv) return;

  conv.messages = newMessages;

  // 如果有消息，更新对话标题为首条用户消息摘要
  if (newMessages.length > 0 && conv.label === "新对话") {
    const firstUserMessage = newMessages.find((m) => m.message.role === "user");
    if (firstUserMessage) {
      const contentStr =
        typeof firstUserMessage.message.content === "string"
          ? firstUserMessage.message.content
          : "";
      conv.label = getMessagePreview(contentStr);
    }
  }
};

const handleNewConversation = () => {
  // 草稿态下重复点击只提示，不重复创建
  if (isInDraftMode.value) {
    setMessages([]);
    showWelcome.value = true;
    message.info("当前已经是新对话");
    return;
  }

  currentConversationKey.value = "";
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

const resetToDraftConversation = () => {
  conversationList.value = [];
  currentConversationKey.value = "";
  setMessages([]);
  showWelcome.value = true;
};

const applyPersistedState = (persistedState: PersistedChatState) => {
  conversationList.value = persistedState.conversationList.map((conv) => {
    if (conv.label === "默认对话") {
      if (conv.messages?.length) {
        const firstUserMessage = conv.messages.find((m) => m.message.role === "user");
        if (firstUserMessage && typeof firstUserMessage.message.content === "string") {
          return { ...conv, label: getMessagePreview(firstUserMessage.message.content) };
        }
      }
      return { ...conv, label: "新对话" };
    }
    return {
      ...conv,
      key: String(conv.key),
      label: typeof conv.label === "string" && conv.label.trim() ? conv.label : "新对话",
    };
  });
  currentModel.value = persistedState.currentModel;

  // 导入后保持草稿态，历史会话保留在侧栏供手动打开
  currentConversationKey.value = "";
  setMessages([]);
  showWelcome.value = true;
};

const handleClearLocalHistory = async () => {
  const confirmed = window.confirm("确定清空本地聊天记录吗？此操作不可恢复。");
  if (!confirmed) return;

  abort();
  await clearChatState();
  resetToDraftConversation();
};

const schedulePersistState = () => {
  if (isHydrating.value) return;

  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    const state = {
      version: 1 as const,
      currentConversationKey: currentConversationKey.value,
      currentModel: currentModel.value,
      conversationList: toPersistedConversations(conversationList.value),
    };
    void saveChatState(state);
  }, 250);
};

const handleExportLocalHistory = () => {
  const state: PersistedChatState = {
    version: 1,
    currentConversationKey: currentConversationKey.value,
    currentModel: currentModel.value,
    conversationList: toPersistedConversations(conversationList.value),
  };
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const link = document.createElement("a");
  link.href = url;
  link.download = `open-chat-logs-${timestamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
  message.success("日志导出成功");
};

const handleImportLocalHistory = async (file: File) => {
  if (!file.name.toLowerCase().endsWith(".json")) {
    message.error("仅支持导入 JSON 日志文件");
    return;
  }

  const shouldOverwrite = window.confirm("导入会覆盖当前本地聊天记录，是否继续？");
  if (!shouldOverwrite) return;

  try {
    const text = await file.text();
    const raw = JSON.parse(text) as unknown;
    const importedState = normalizePersistedChatState(raw);

    if (!importedState) {
      message.error("日志文件格式不正确，导入失败");
      return;
    }

    abort();
    applyPersistedState(importedState);
    await saveChatState({
      ...importedState,
      currentConversationKey: "",
      conversationList: toPersistedConversations(conversationList.value),
    });
    message.success(`日志导入成功，共 ${conversationList.value.length} 条会话`);
  } catch (error) {
    console.error("Failed to import chat history:", error);
    message.error("日志导入失败，请检查文件内容");
  }
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
  return new DeepSeekChatProvider({
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
  schedulePersistState();
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
    const nextExpandedMap: Record<string, boolean> = {};
    const nextDoneMap: Record<string, boolean> = {};

    newMessages.forEach(({ id, message }) => {
      if (message.role !== "assistant" || typeof message.content !== "string") {
        return;
      }

      const parsed = parseThinkContent(message.content);
      if (!parsed) {
        return;
      }

      const key = String(id);
      const prevDone = thinkDoneMap.value[key];
      const prevExpanded = thinkExpandedMap.value[key];

      nextDoneMap[key] = parsed.thinkDone;

      if (prevExpanded === undefined) {
        // 新思考消息：进行中默认展开，已完成默认收起
        nextExpandedMap[key] = !parsed.thinkDone;
        return;
      }

      if (prevDone === false && parsed.thinkDone) {
        // 仅在“进行中 -> 已完成”这个瞬间自动收起，触发 Think 自带过渡动画
        nextExpandedMap[key] = false;
        return;
      }

      // 其他情况保留用户手动展开/收起状态
      nextExpandedMap[key] = prevExpanded;
    });

    thinkExpandedMap.value = nextExpandedMap;
    thinkDoneMap.value = nextDoneMap;

    updateCurrentConversationMessages(newMessages);
    showWelcome.value = newMessages.length === 0;
    schedulePersistState();
  },
  { deep: true },
);

watch(
  [conversationList, currentConversationKey],
  () => {
    schedulePersistState();
  },
  { deep: true },
);

onMounted(async () => {
  const persistedState = await loadChatState();

  if (persistedState && persistedState.conversationList.length > 0) {
    applyPersistedState(persistedState);
  } else {
    conversationList.value = [];
    currentConversationKey.value = "";
    setMessages([]);
    showWelcome.value = true;
  }

  isHydrating.value = false;
});

onBeforeUnmount(() => {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
});

// ============ 消息转换 ============

const bubbleItems = computed<BubbleItemType[]>(() =>
  messages.value.map(({ id, message, status }) => ({
    key: id,
    role: message.role,
    status,
    loading: status === "loading",
    content: typeof message.content === "string" ? message.content : "",
    footer:
      // 仅在 AI 回复完整结束后（success）展示重试，避免流式中/异常态提前出现
      message.role === "assistant" && status === "success"
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
    contentRender: (value: string, info) => {
      const parsedThink = parseThinkContent(value);
      if (!parsedThink) {
        return renderMarkdown(value);
      }

      const nodes = [];

      if (parsedThink.thinkContent) {
        const thinkKey = String(info?.key ?? "");
        const expanded = thinkExpandedMap.value[thinkKey] ?? !parsedThink.thinkDone;

        nodes.push(
          h(
            Think,
            {
              title: parsedThink.thinkDone ? "思考过程" : "思考中...",
              loading: !parsedThink.thinkDone,
              expanded,
              blink: !parsedThink.thinkDone,
              "onUpdate:expanded": (nextExpanded: boolean) => {
                thinkExpandedMap.value = {
                  ...thinkExpandedMap.value,
                  [thinkKey]: nextExpanded,
                };
              },
            },
            {
              default: () => renderMarkdown(parsedThink.thinkContent),
            },
          ),
        );
      }

      if (parsedThink.answerContent) {
        nodes.push(renderMarkdown(parsedThink.answerContent));
      }

      return h("div", { class: "assistant-content-stack" }, nodes);
    },
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

  // 草稿态首次发送时，才创建真实会话并写入侧栏
  if (isInDraftMode.value) {
    const newConversation = createNewConversation();
    conversationList.value.unshift(newConversation);
    currentConversationKey.value = String(newConversation.key);
  }

  showWelcome.value = false;
  onRequest({
    messages: [{ role: "user", content: nextContent }],
    // Qwen(DashScope/OpenAI Compatible) 深度思考参数
    enable_thinking: thinkingEnabled.value,
    // 兼容部分 OpenAI-like 网关的思考参数
    thinking: { type: thinkingEnabled.value ? "enabled" : "disabled" },
  });
  // 清空输入框
  setTimeout(() => {
    content.value = "";
  }, 0);
};

const handleModelChange = (key: string) => {
  currentModel.value = key;
};

const handleThinkingChange = (value: boolean) => {
  thinkingEnabled.value = value;
};
</script>

<template>
  <div class="chat-layout">
    <!-- 左侧边栏 - 对话列表 -->
    <ChatSidebar
      :open="conversationsOpen"
      :conversation-list="conversationList"
      :current-key="currentConversationKey"
      @new-conversation="handleNewConversation"
      @active-change="handleActiveChange"
    />

    <!-- 主聊天区域 -->
    <div class="chat-main">
      <!-- 头部 -->
      <ChatHeader
        @toggle-sidebar="handleSidebarToggle"
        @export-local-history="handleExportLocalHistory"
        @import-local-history="handleImportLocalHistory"
        @clear-local-history="handleClearLocalHistory"
      />

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
        :current-model="currentModel"
        :thinking-enabled="thinkingEnabled"
        :model-items="modelDropdownItems ?? []"
        @change="handleChange"
        @cancel="abort"
        @submit="handleSubmit"
        @model-change="handleModelChange"
        @thinking-change="handleThinkingChange"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  background: var(--brand-white);
  color: var(--brand-gray-900);
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-main :deep(.assistant-content-stack) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
