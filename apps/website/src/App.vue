<script setup lang="ts">
import { XProvider } from "@antdv-next/x";
import Chat from "./components/Chat.vue";
import { brandTheme } from "./theme/brandTheme";
</script>

<template>
  <XProvider :theme="brandTheme">
    <Chat />
  </XProvider>
</template>
