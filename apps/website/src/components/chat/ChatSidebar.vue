<script setup lang="ts">
import type { ConversationItemType, ConversationsProps } from "@antdv-next/x";
import { Conversations } from "@antdv-next/x";

interface Props {
  open: boolean;
  conversationList: ConversationItemType[];
  currentKey: string;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "newConversation"): void;
  (e: "activeChange", key: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const handleOpenChange = (value: boolean) => {
  emit("update:open", value);
};

const handleNewConversation = () => {
  emit("newConversation");
};

const handleActiveChange: ConversationsProps["onActiveChange"] = (key) => {
  emit("activeChange", key);
};
</script>

<template>
  <div class="chat-sidebar" :class="open ? 'block' : 'hidden'">
    <Conversations
      :creation="{ onClick: handleNewConversation }"
      :items="conversationList"
      :active-key="currentKey"
      :open="open"
      :groupable="true"
      @active-change="handleActiveChange"
      @open-change="handleOpenChange"
    />
  </div>
</template>

<style scoped>
.chat-sidebar {
  width: 280px;
  border-right: 1px solid #f0f0f0;
  background: #fafafa;
  transition: transform 0.3s ease;
}
</style>
