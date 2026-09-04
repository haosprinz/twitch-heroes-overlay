<script setup lang="ts">
import type { Hero } from "@/types/hero";

defineProps<{
  hero: Hero;
  message: string;
}>();
</script>

<template>
  <div
    class="chat-bubble"
    :style="{
      '--bubble-color': hero.bubbleColor,
      background: hero.bubbleColor,
      color: hero.fontColor,
      fontSize: `${hero.fontSize}px`,
    }"
  >
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<style scoped>
.chat-bubble {
  position: relative;
  max-width: 280px;
  min-width: 48px;
  min-height: 28px;
  margin-bottom: 8px;
  padding: 8px 12px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.chat-bubble::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  border-width: 8px 8px 0;
  border-style: solid;
  border-color: var(--bubble-color, #fff) transparent transparent;
}

.chat-bubble p {
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}
</style>
