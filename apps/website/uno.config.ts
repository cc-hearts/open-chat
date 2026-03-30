import { defineConfig, presetUno, presetIcons, presetTypography } from "unocss";

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
    presetTypography(),
  ],
  shortcuts: {
    // Layout shortcuts
    "chat-layout": "flex h-screen bg-white",
    "chat-sidebar": "w-70 border-r border-gray-200 bg-gray-50 transition-transform duration-300",
    "chat-sidebar-closed": "translate-x-0",
    "chat-main": "flex-1 flex flex-col overflow-hidden",
    "chat-header": "flex items-center gap-4 px-5 py-3 border-b border-gray-200 bg-white",
    "messages-wrapper": "flex-1 overflow-hidden p-5",
    "chat-footer": "border-t border-gray-200 p-4 bg-white",
    // Button shortcuts
    "menu-toggle":
      "flex items-center justify-center p-2 border-none bg-transparent cursor-pointer rounded-2 hover:bg-gray-100 text-gray-600 transition-colors",
    // Model selector
    "model-selector":
      "flex items-center justify-center p-2 cursor-pointer rounded-2 transition-all hover:bg-gray-100 active:bg-gray-200",
    "model-icon-wrapper": "flex items-center justify-center w-8 h-8 rounded-2 transition-all",
    // Welcome screen
    "welcome-container": "flex flex-col items-center justify-center h-full gap-6",
    "prompts-wrapper": "flex flex-wrap items-center justify-center gap-2",
    // Bubble list
    "bubble-list": "h-full",
    // Markdown
    "markdown-content": "text-14px leading-1.6",
  },
  rules: [
    // Custom rules if needed
  ],
  theme: {
    colors: {
      primary: "#6B5CE7",
    },
  },
});
