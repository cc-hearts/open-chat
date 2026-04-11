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
    "chat-layout": "flex h-screen bg-brand-page text-brand-900",
    "chat-sidebar":
      "w-70 border-r border-brand-100 bg-brand-subtle transition-transform duration-300",
    "chat-sidebar-closed": "translate-x-0",
    "chat-main": "flex-1 flex flex-col overflow-hidden",
    "chat-header": "flex items-center gap-4 px-5 py-3 border-b border-brand-100 bg-brand-page",
    "messages-wrapper": "flex-1 overflow-hidden p-5",
    "chat-footer": "border-t border-brand-100 p-4 bg-brand-page",
    // Button shortcuts
    "menu-toggle":
      "flex items-center justify-center p-2 border-none bg-transparent cursor-pointer rounded-2 hover:bg-brand-100 text-brand-500 transition-colors",
    // Model selector
    "model-selector":
      "flex items-center justify-center p-2 cursor-pointer rounded-2 transition-all hover:bg-brand-100 active:bg-brand-100",
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
      brand: {
        page: "#ffffff",
        subtle: "#fafafa",
        50: "#fafafa",
        100: "#ebebeb",
        400: "#808080",
        500: "#666666",
        600: "#4d4d4d",
        900: "#171717",
      },
      workflow: {
        develop: "#0a72ef",
        preview: "#de1d8d",
        ship: "#ff5b4f",
      },
      interactive: {
        link: "#0072f5",
        focus: "#0075f5",
      },
      badge: {
        blue: "#0068d6",
        "blue-bg": "#ebf5ff",
      },
      console: {
        blue: "#0070f3",
        purple: "#7928ca",
        pink: "#eb367f",
      },
      primary: "#0072f5",
    },
  },
});
