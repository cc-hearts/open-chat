<script setup lang="ts">
import { Sender } from "@antdv-next/x";

interface Props {
  modelValue: string;
  loading: boolean;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
  (e: "cancel"): void;
  (e: "submit", value: string): void;
}

defineProps<Props>();
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
    >
      <template v-if="$slots.prefix" #prefix>
        <slot name="prefix" />
      </template>
    </Sender>
  </div>
</template>

<style scoped>
.chat-footer {
  border-top: 1px solid #f0f0f0;
  padding: 16px 20px;
  background: #fff;
}

.chat-footer :deep(.x-sender) {
  max-width: 900px;
  margin: 0 auto;
}

:deep(.antd-sender-content) {
  align-items: center;
}
</style>
