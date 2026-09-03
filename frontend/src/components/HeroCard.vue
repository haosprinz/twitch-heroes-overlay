<script setup lang="ts">
import type { Hero } from "@/types/hero";
import { assetUrl } from "@/utils/assetUrl";

defineProps<{
  hero: Hero;
  active?: boolean;
}>();
</script>

<template>
  <div class="hero-card" :style="{ width: `${active ? hero.activeWidth : hero.width}px` }">
    <img
      v-if="hero.gifUrl"
      :src="assetUrl(hero.gifUrl)"
      :alt="hero.name"
      :width="active ? hero.activeWidth : hero.width"
      :height="active ? hero.activeHeight : hero.height"
    />
    <div v-else class="hero-card__placeholder">{{ hero.name }}</div>
  </div>
</template>

<style scoped>
.hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: width 0.25s ease;
}

.hero-card img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
  transition: width 0.25s ease, height 0.25s ease;
}

.hero-card__placeholder {
  padding: 24px;
  border-radius: 12px;
  background: rgba(145, 70, 255, 0.35);
  color: #fff;
  font-weight: 700;
}
</style>
