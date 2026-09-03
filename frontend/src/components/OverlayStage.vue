<script setup lang="ts">
import { computed } from "vue";
import ChatBubble from "@/components/ChatBubble.vue";
import HeroCard from "@/components/HeroCard.vue";
import { useChatStore } from "@/stores/chatStore";
import { useHeroStore } from "@/stores/heroStore";

const props = defineProps<{
  idle?: boolean;
  embedded?: boolean;
}>();

const heroStore = useHeroStore();
const chatStore = useChatStore();

const activeMap = computed(() => {
  const map = new Map<number, { username: string; message: string }>();
  if (props.idle) return map;
  for (const item of chatStore.activations) {
    map.set(item.heroId, item);
  }
  return map;
});
</script>

<template>
  <div class="overlay" :class="{ 'overlay--embedded': embedded }">
    <div v-for="hero in heroStore.heroes" :key="hero.id" class="overlay__hero">
      <Transition name="bubble">
        <ChatBubble
          v-if="activeMap.get(hero.id)"
          :hero="hero"
          :username="activeMap.get(hero.id)!.username"
          :message="activeMap.get(hero.id)!.message"
        />
      </Transition>
      <HeroCard :hero="hero" :active="activeMap.has(hero.id)" />
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
  padding: 24px;
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
  gap: 8px;
  contain: layout;
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
