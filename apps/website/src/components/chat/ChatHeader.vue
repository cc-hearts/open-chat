<script setup lang="ts">
import { DeleteOutlined, DownloadOutlined, UploadOutlined } from "@antdv-next/icons";
import { Tooltip } from "antdv-next";

interface Emits {
  (e: "toggleSidebar"): void;
  (e: "clearLocalHistory"): void;
  (e: "exportLocalHistory"): void;
  (e: "importLocalHistory", file: File): void;
}

const emit = defineEmits<Emits>();

const handleImportChange = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  emit("importLocalHistory", file);
  input.value = "";
};
</script>

<template>
  <div class="chat-header">
    <button class="menu-toggle" @click="emit('toggleSidebar')">
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
    <div class="header-actions">
      <Tooltip title="导出日志">
        <button
          class="header-btn icon-btn"
          type="button"
          aria-label="导出日志"
          @click="emit('exportLocalHistory')"
        >
          <DownloadOutlined />
        </button>
      </Tooltip>

      <Tooltip title="导入日志">
        <label class="header-btn icon-btn import-btn" aria-label="导入日志">
          <UploadOutlined />
          <input
            class="import-input"
            type="file"
            accept="application/json,.json"
            @change="handleImportChange"
          />
        </label>
      </Tooltip>

      <Tooltip title="清空本地记录">
        <button
          class="header-btn icon-btn danger-btn"
          type="button"
          aria-label="清空本地记录"
          @click="emit('clearLocalHistory')"
        >
          <DeleteOutlined />
        </button>
      </Tooltip>
    </div>
  </div>
</template>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--brand-gray-100);
  background: var(--brand-white);
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
  color: var(--brand-gray-500);
  transition: background 0.2s;
}

.menu-toggle:hover {
  background: var(--brand-gray-100);
}

.chat-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--brand-gray-900);
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  border: none;
  background: transparent;
  color: var(--brand-gray-500);
  font-size: 13px;
  line-height: 1;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.header-btn:hover {
  background: var(--brand-gray-100);
}

.icon-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.danger-btn {
  color: #ff4d4f;
}

.danger-btn:hover {
  background: #fff1f0;
}

.import-btn {
  position: relative;
}

.import-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
