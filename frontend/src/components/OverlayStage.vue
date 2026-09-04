<script setup lang="ts">
import { computed } from "vue";
import ChatBubble from "@/components/ChatBubble.vue";
import HeroCard from "@/components/HeroCard.vue";
import { useChatStore, type HeroActivation } from "@/stores/chatStore";
import type { OverlaySlot } from "@/types/overlay";

const props = defineProps<{
  items: OverlaySlot[];
  idle?: boolean;
  embedded?: boolean;
  activations?: HeroActivation[];
}>();

const chatStore = useChatStore();

const activeMap = computed(() => {
  const map = new Map<number, { message: string }>();
  if (props.idle) return map;
  const list = props.activations ?? chatStore.activations;
  for (const item of list) {
    if (item.chatterId) map.set(item.chatterId, { message: item.message });
  }
  return map;
});
</script>

<template>
  <div class="overlay" :class="{ 'overlay--embedded': embedded }">
    <div v-for="slot in items" :key="slot.id" class="overlay__hero">
      <Transition name="bubble">
        <ChatBubble
          v-if="activeMap.get(slot.id)"
          :hero="slot.hero"
          :message="activeMap.get(slot.id)!.message"
        />
      </Transition>
      <div class="overlay__user-name">{{ slot.username }}</div>
      <HeroCard :hero="slot.hero" :active="activeMap.has(slot.id)" />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  min-height: 100vh;
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
  padding: 48px 24px 24px;
  background: transparent;
  contain: layout;
}

.overlay--embedded {
  min-height: 0;
  height: 100%;
}

.overlay__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  contain: layout;
}

.overlay__user-name {
  max-width: 220px;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  letter-spacing: 0.02em;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 0 4px #000;
  word-break: break-word;
}

.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
