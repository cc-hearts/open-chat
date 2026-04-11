<script setup lang="ts">
import type { ConversationItemType, ConversationsProps } from "@antdv-next/x";
import { Conversations } from "@antdv-next/x";
import { h } from "vue";

interface Props {
  open: boolean;
  conversationList: ConversationItemType[];
  currentKey: string;
}

interface Emits {
  (e: "newConversation"): void;
  (e: "activeChange", key: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const handleNewConversation = () => {
  emit("newConversation");
};

const handleActiveChange: ConversationsProps["onActiveChange"] = (key) => {
  emit("activeChange", key);
};

const creationConfig = {
  label: h("span", { class: "antd-conversations-creation-label" }, "新对话"),
  onClick: handleNewConversation,
};
</script>

<template>
  <aside class="chat-sidebar" :class="{ 'is-collapsed': !open }">
    <Conversations
      :creation="creationConfig"
      :items="conversationList"
      :active-key="currentKey"
      :groupable="true"
      @active-change="handleActiveChange"
    />
  </aside>
</template>

<style scoped>
.chat-sidebar {
  --sidebar-expanded-width: 280px;
  --sidebar-collapsed-width: 72px;
  --sidebar-width-easing: cubic-bezier(0.22, 1, 0.36, 1);
  --sidebar-fade-easing: cubic-bezier(0.32, 0, 0.2, 1);
  width: var(--sidebar-expanded-width);
  flex: 0 0 auto;
  overflow: hidden;
  border-right: 1px solid var(--brand-gray-100);
  background: var(--brand-gray-50);
  will-change: width;
  transition:
    width 0.32s var(--sidebar-width-easing),
    background-color 0.24s ease,
    border-color 0.24s ease;
}

.chat-sidebar.is-collapsed {
  width: var(--sidebar-collapsed-width);
}

.chat-sidebar :deep(.antd-conversations) {
  height: 100%;
  overflow-x: clip;
}

.chat-sidebar :deep(.antd-conversations-item),
.chat-sidebar :deep(.antd-conversations-creation) {
  transition:
    padding 0.32s var(--sidebar-width-easing),
    gap 0.24s var(--sidebar-fade-easing),
    min-height 0.24s ease;
}

.chat-sidebar :deep(.antd-conversations-icon),
.chat-sidebar :deep(.antd-conversations-creation-icon) {
  flex: 0 0 20px;
  width: 20px;
  min-width: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.chat-sidebar :deep(.antd-conversations-label),
.chat-sidebar :deep(.antd-conversations-creation-label),
.chat-sidebar :deep(.antd-conversations-group-title) {
  max-width: 200px;
  overflow: hidden;
  white-space: nowrap;
  opacity: 1;
  transform: translateX(0);
  transform-origin: left center;
  will-change: opacity, transform, max-width;
  transition:
    opacity 0.16s ease,
    transform 0.24s var(--sidebar-fade-easing),
    max-width 0.32s var(--sidebar-width-easing);
}

.chat-sidebar :deep(.antd-conversations-menu-icon) {
  opacity: 0;
  transform: translateX(0);
  transition:
    opacity 0.16s ease,
    transform 0.24s var(--sidebar-fade-easing);
}

.chat-sidebar :deep(.antd-conversations-group-title) {
  overflow: hidden;
  max-height: 36px;
  opacity: 1;
  transform: translateX(0);
  transform-origin: left center;
  transition:
    max-height 0.28s var(--sidebar-width-easing),
    padding-block 0.24s var(--sidebar-fade-easing),
    opacity 0.18s ease,
    transform 0.24s var(--sidebar-fade-easing),
    min-height 0.24s ease;
}

.chat-sidebar:not(.is-collapsed) :deep(.antd-conversations-label),
.chat-sidebar:not(.is-collapsed) :deep(.antd-conversations-creation-label),
.chat-sidebar:not(.is-collapsed) :deep(.antd-conversations-group-title),
.chat-sidebar:not(.is-collapsed) :deep(.antd-conversations-menu-icon) {
  transition-delay: 0.06s;
}

.chat-sidebar.is-collapsed :deep(.antd-conversations-item),
.chat-sidebar.is-collapsed :deep(.antd-conversations-creation) {
  gap: 0;
  padding-inline: 10px;
}

.chat-sidebar.is-collapsed :deep(.antd-conversations-item),
.chat-sidebar.is-collapsed :deep(.antd-conversations-creation) {
  justify-content: center;
}

.chat-sidebar.is-collapsed :deep(.antd-conversations-label),
.chat-sidebar.is-collapsed :deep(.antd-conversations-creation-label),
.chat-sidebar.is-collapsed :deep(.antd-conversations-group-title) {
  max-width: 0;
  opacity: 0;
  transform: translateX(-10px);
  pointer-events: none;
  transition-delay: 0s;
}

.chat-sidebar.is-collapsed :deep(.antd-conversations-menu-icon) {
  opacity: 0;
  transform: translateX(-6px);
  pointer-events: none;
  transition-delay: 0s;
}

.chat-sidebar.is-collapsed :deep(.antd-conversations-group-title) {
  min-height: 0;
  max-height: 0;
  padding-block: 0;
  margin-block: 0;
  opacity: 0;
  transform: translateX(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .chat-sidebar,
  .chat-sidebar :deep(.antd-conversations-item),
  .chat-sidebar :deep(.antd-conversations-creation),
  .chat-sidebar :deep(.antd-conversations-group-title),
  .chat-sidebar :deep(.antd-conversations-label),
  .chat-sidebar :deep(.antd-conversations-creation-label),
  .chat-sidebar :deep(.antd-conversations-menu-icon) {
    transition: none;
  }
}
</style>
