<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import type { Hero } from "@/types/hero";

const TEXT_MAX = 50;

const props = defineProps<{
  hero: Hero;
  message: string;
}>();

const textRef = ref<HTMLElement | null>(null);
const overflow = ref(0);

function measure() {
  const height = textRef.value?.scrollHeight ?? 0;
  overflow.value = Math.max(0, height - TEXT_MAX);
}

watch(
  () => props.message,
  async () => {
    overflow.value = 0;
    await nextTick();
    measure();
  },
  { immediate: true },
);

onMounted(() => {
  void nextTick(measure);
});
</script>

<template>
  <div
    class="chat-bubble"
    :style="{
      '--bubble-color': hero.bubbleColor,
      '--scroll': `${overflow}px`,
      '--scroll-ms': `${4000 + overflow * 40}ms`,
      background: hero.bubbleColor,
      color: hero.fontColor,
      fontSize: `${hero.fontSize}px`,
    }"
  >
    <div v-if="message" class="chat-bubble__clip">
      <p
        ref="textRef"
        class="chat-bubble__text"
        :class="{ 'chat-bubble__text--scroll': overflow > 0 }"
      >
        {{ message }}
      </p>
    </div>
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

.chat-bubble__clip {
  max-height: 50px;
  overflow: hidden;
}

.chat-bubble__text {
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.chat-bubble__text--scroll {
  animation: bubble-scroll var(--scroll-ms, 8s) linear infinite;
}

@keyframes bubble-scroll {
  0%, 12% { transform: translateY(0); }
  88%, 100% { transform: translateY(calc(-1 * var(--scroll, 0px))); }
}
</style>
