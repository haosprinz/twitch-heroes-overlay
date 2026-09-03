<script setup lang="ts">
import type { Hero } from "@/types/hero";

defineProps<{
  hero: Hero;
  username: string;
  message: string;
}>();
</script>

<template>
  <div
    class="chat-bubble"
    :style="{
      background: hero.bubbleColor,
      color: hero.fontColor,
      fontSize: `${hero.fontSize}px`,
    }"
  >
    <strong>{{ username }}</strong>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<style scoped>
.chat-bubble {
  max-width: 280px;
  padding: 8px 12px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.chat-bubble p {
  margin: 4px 0 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}
</style>
