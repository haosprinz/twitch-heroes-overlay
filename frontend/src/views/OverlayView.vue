<script setup lang="ts">
import { computed, onMounted } from "vue";
import OverlayStage from "@/components/OverlayStage.vue";
import { useChatters } from "@/composables/useChatters";
import { useHeroes } from "@/composables/useHeroes";
import { useWebSocket } from "@/composables/useWebSocket";
import { useChatterStore } from "@/stores/chatterStore";
import { useDuelStore } from "@/stores/duelStore";
import { useHeroStore } from "@/stores/heroStore";
import type { OverlaySlot } from "@/types/overlay";

const heroStore = useHeroStore();
const chatterStore = useChatterStore();
const duelStore = useDuelStore();
const { fetchHeroes } = useHeroes();
const { fetchChatters } = useChatters();
useWebSocket();

function overlayStatus(
  status: OverlaySlot["status"],
  lyingUntil?: string | null,
): OverlaySlot["status"] {
  if (lyingUntil && new Date(lyingUntil).getTime() > Date.now()) return "lying";
  if (status === "lying") return "patrol";
  return status;
}

const overlayItems = computed<OverlaySlot[]>(() => {
  if (duelStore.actors.length) {
    return duelStore.actors.map((actor) => ({
      id: actor.chatterId,
      hero: actor.hero,
      username: actor.displayName || actor.username,
      status: overlayStatus(actor.status, actor.lyingUntil),
      lyingUntil: actor.lyingUntil,
    }));
  }
  return chatterStore.overlayChatters.flatMap((chatter) => {
    if (!chatter.heroId) return [];
    const hero = heroStore.heroes.find((item) => item.id === chatter.heroId);
    return hero
      ? [
          {
            id: chatter.id,
            hero,
            username: chatter.displayName || chatter.username,
            status: overlayStatus(chatter.status, chatter.lyingUntil),
            lyingUntil: chatter.lyingUntil,
          },
        ]
      : [];
  });
});

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
