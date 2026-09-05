<script setup lang="ts">
import DrawnHero from "@/components/DrawnHero.vue";
import type { Hero, HeroStatus } from "@/types/hero";

defineProps<{
  hero: Hero;
  active?: boolean;
  status?: HeroStatus;
}>();

const labels: Record<HeroStatus, string> = {
  patrol: "патрулирование",
  duel: "в дуэли",
  lying: "лежит",
};
</script>

<template>
  <div class="hero-card">
    <DrawnHero :hero="hero" :pose="status === 'lying' ? 'lie' : active ? 'ready' : 'idle'" />
    <div v-if="status" class="hero-card__status">{{ labels[status] }}</div>
  </div>
</template>

<style scoped>
.hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-card__status {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.7);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
</style>
