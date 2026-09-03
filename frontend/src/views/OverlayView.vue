<script setup lang="ts">
import { onMounted } from "vue";
import OverlayStage from "@/components/OverlayStage.vue";
import { useWebSocket } from "@/composables/useWebSocket";
import { useHeroes } from "@/composables/useHeroes";
import { useHeroStore } from "@/stores/heroStore";

const heroStore = useHeroStore();
const { fetchHeroes } = useHeroes();
useWebSocket();

onMounted(async () => {
  try {
    heroStore.setHeroes(await fetchHeroes());
  } catch (error) {
    console.warn("Heroes API is not ready yet", error);
  }
});
</script>

<template>
  <OverlayStage />
</template>
