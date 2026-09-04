<script setup lang="ts">
import { computed, onMounted } from "vue";
import OverlayStage from "@/components/OverlayStage.vue";
import { useChatters } from "@/composables/useChatters";
import { useHeroes } from "@/composables/useHeroes";
import { useWebSocket } from "@/composables/useWebSocket";
import { useChatterStore } from "@/stores/chatterStore";
import { useHeroStore } from "@/stores/heroStore";
import type { OverlaySlot } from "@/types/overlay";

const heroStore = useHeroStore();
const chatterStore = useChatterStore();
const { fetchHeroes } = useHeroes();
const { fetchChatters } = useChatters();
useWebSocket();

const overlayItems = computed<OverlaySlot[]>(() =>
  chatterStore.overlayChatters.flatMap((chatter) => {
    if (!chatter.heroId) return [];
    const hero = heroStore.heroes.find((item) => item.id === chatter.heroId);
    return hero
      ? [{ id: chatter.id, hero, username: chatter.displayName || chatter.username }]
      : [];
  }),
);

onMounted(async () => {
  try {
    heroStore.setHeroes(await fetchHeroes());
  } catch (error) {
    console.warn("Heroes API is not ready yet", error);
  }
  try {
    const result = await fetchChatters(1, 500);
    chatterStore.setOverlayChatters(result.chatters);
  } catch (error) {
    console.warn("Chatters API is not ready yet", error);
  }
});
</script>

<template>
  <OverlayStage :items="overlayItems" />
</template>
