<script setup lang="ts">
import { Sender } from "@antdv-next/x";
import { BulbOutlined } from "@antdv-next/icons";
import { Button, Dropdown, Tooltip, type MenuProps } from "antdv-next";
import { computed } from "vue";

interface Props {
  modelValue: string;
  loading: boolean;
  currentModel: string;
  thinkingEnabled: boolean;
  modelItems: NonNullable<MenuProps["items"]>;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
  (e: "cancel"): void;
  (e: "submit", value: string): void;
  (e: "modelChange", key: string): void;
  (e: "thinkingChange", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleChange = (value: string) => {
  emit("update:modelValue", value);
  emit("change", value);
};

const handleSubmit = (value: string) => {
  emit("submit", value);
};

const handleCancel = () => {
  emit("cancel");
};

const handleThinkingChange = (checked: boolean) => {
  emit("thinkingChange", checked);
};

const modelMenu = computed<MenuProps>(() => ({
  items: props.modelItems,
  selectedKeys: [props.currentModel],
  onClick: ({ key }) => emit("modelChange", String(key)),
}));
</script>

<template>
  <div class="chat-footer">
    <Sender
      :value="modelValue"
      :loading="loading"
      placeholder="请输入内容，按下 Enter 发送消息 (Shift+Enter 换行)"
      :on-cancel="handleCancel"
      :on-change="handleChange"
      :on-submit="handleSubmit"
      :suffix="false"
    >
      <template #footer="{ defaultNode }">
        <div class="sender-footer">
          <div class="sender-controls">
            <Dropdown :menu="modelMenu" :trigger="['click']">
              <button class="model-switcher" type="button">
                {{ currentModel }}
              </button>
            </Dropdown>
            <Tooltip :title="thinkingEnabled ? '关闭深度思考' : '开启深度思考'">
              <Button
                type="text"
                class="thinking-toggle-btn"
                :class="{ active: thinkingEnabled }"
                aria-label="深度思考开关"
                :aria-pressed="thinkingEnabled"
                @click="handleThinkingChange(!thinkingEnabled)"
              >
                <BulbOutlined />
              </Button>
            </Tooltip>
          </div>
          <div class="sender-actions">
            <component :is="defaultNode" />
          </div>
        </div>
      </template>
    </Sender>
  </div>
</template>

<style scoped>
.chat-footer {
  padding: 16px 20px;
  background: var(--brand-white);
}

.chat-footer :deep(.x-sender) {
  max-width: 900px;
  margin: 0 auto;
}

:deep(.antd-sender-main) {
  border: none;
  box-shadow: var(--brand-shadow-card);
}

:deep(.antd-sender-content) {
  align-items: center;
}

.sender-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.sender-controls {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.model-switcher {
  border: 1px solid var(--brand-gray-100);
  background: var(--brand-gray-50);
  color: var(--brand-gray-900);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
}

.model-switcher:hover {
  background: var(--brand-white);
}

.thinking-toggle-btn {
  width: 28px;
  height: 28px;
  font-size: 15px;
  color: var(--brand-gray-500);
  border-radius: 8px;
  transition: color 0.2s ease;
}

.thinking-toggle-btn.active {
  color: var(--brand-link);
}

.thinking-toggle-btn.active:hover {
  color: var(--brand-link);
}
.sender-actions {
  display: flex;
  align-items: center;
}

:deep(.antd-sender-actions-list-presets) {
  display: flex;
  align-items: center;
}
</style>
