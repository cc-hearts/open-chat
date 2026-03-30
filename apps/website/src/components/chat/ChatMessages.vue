<script setup lang="ts">
import type { BubbleItemType, BubbleListProps } from "@antdv-next/x";
import { BubbleList, Welcome, Prompts } from "@antdv-next/x";

interface Props {
  showWelcome: boolean;
  bubbleItems: BubbleItemType[];
  roleConfig: BubbleListProps["role"];
}

interface Emits {
  (e: "promptClick", info: { data: { description?: string } }): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const handlePromptClick = (info: any) => {
  emit("promptClick", info);
};
</script>

<template>
  <div class="messages-wrapper">
    <template v-if="showWelcome">
      <div class="welcome-container">
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
    </template>
    <template v-else>
      <BubbleList
        :style="{ height: '100%' }"
        :role="roleConfig"
        :items="bubbleItems"
        :auto-scroll="true"
        class="bubble-list"
      />
    </template>
  </div>
</template>

<style scoped>
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

.prompts-wrapper :deep(.antd-prompts-list) {
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
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
