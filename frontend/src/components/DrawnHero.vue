<script setup lang="ts">
import { computed } from "vue";
import { defaultHeroConfig, type Hero, type HeroConfig } from "@/types/hero";

const props = defineProps<{
  hero?: Hero | null;
  config?: HeroConfig;
  pose?: "walk" | "ready" | "fall" | "lie" | "getup" | "cheer" | "idle";
  facing?: 1 | -1;
}>();

const look = computed<HeroConfig>(() => {
  if (props.config) return { ...defaultHeroConfig(), ...props.config };
  if (props.hero?.config) return { ...defaultHeroConfig(props.hero.name), ...props.hero.config };
  return defaultHeroConfig(props.hero?.name || "Герой");
});

const scale = computed(() => look.value.size || 1);
const pose = computed(() => props.pose || "walk");
</script>

<template>
  <div
    class="drawn-hero"
    :class="[`drawn-hero--${pose}`, { 'drawn-hero--flip': facing === -1 }]"
    :style="{ '--scale': scale }"
  >
    <div v-if="pose === 'lie' || pose === 'fall'" class="drawn-hero__stars" aria-hidden="true">✦✦✦</div>
    <div v-if="pose === 'cheer'" class="drawn-hero__trophy" aria-hidden="true">🏆</div>
    <svg class="drawn-hero__svg" viewBox="0 0 80 140" xmlns="http://www.w3.org/2000/svg">
      <g class="drawn-hero__body">
        <g class="drawn-hero__leg drawn-hero__leg--left">
          <rect x="28" y="92" width="10" height="28" rx="4" :fill="look.pantsColor" />
          <rect x="27" y="116" width="14" height="7" rx="3" fill="#222" />
        </g>
        <g class="drawn-hero__leg drawn-hero__leg--right">
          <rect x="42" y="92" width="10" height="28" rx="4" :fill="look.pantsColor" />
          <rect x="41" y="116" width="14" height="7" rx="3" fill="#222" />
        </g>
        <rect class="drawn-hero__torso" x="24" y="58" width="32" height="38" rx="8" :fill="look.shirtColor" />
        <g class="drawn-hero__arm drawn-hero__arm--left">
          <rect x="14" y="62" width="10" height="28" rx="5" :fill="look.skin" />
        </g>
        <g class="drawn-hero__arm drawn-hero__arm--right">
          <rect x="56" y="62" width="10" height="28" rx="5" :fill="look.skin" />
        </g>
        <g class="drawn-hero__head">
          <circle cx="40" cy="36" r="18" :fill="look.skin" />
          <circle cx="34" cy="36" r="2.2" fill="#222" />
          <circle cx="46" cy="36" r="2.2" fill="#222" />
          <path d="M34 44 q6 5 12 0" fill="none" stroke="#222" stroke-width="1.4" stroke-linecap="round" />
          <g v-if="look.hair !== 'bald'">
            <ellipse
              v-if="look.hair === 'short'"
              cx="40"
              cy="22"
              rx="16"
              ry="10"
              :fill="look.hairColor"
            />
            <path
              v-if="look.hair === 'long'"
              d="M24 34 q0-22 16-22 q16 0 16 22 v18 h-8 v-14 h-16 v14 h-8 z"
              :fill="look.hairColor"
            />
            <path
              v-if="look.hair === 'spiky'"
              d="M22 32 l8-16 6 10 4-14 6 14 6-12 6 18 z"
              :fill="look.hairColor"
            />
            <g v-if="look.hair === 'ponytail'">
              <ellipse cx="40" cy="22" rx="15" ry="9" :fill="look.hairColor" />
              <path d="M26 28 q-18 8 -8 28" fill="none" :stroke="look.hairColor" stroke-width="6" stroke-linecap="round" />
            </g>
          </g>
          <g v-if="look.glasses !== 'none'" fill="none" stroke="#222" stroke-width="2">
            <rect v-if="look.glasses === 'square'" x="26" y="31" width="12" height="10" rx="1" />
            <rect v-if="look.glasses === 'square'" x="42" y="31" width="12" height="10" rx="1" />
            <circle v-if="look.glasses === 'round'" cx="32" cy="36" r="6" />
            <circle v-if="look.glasses === 'round'" cx="48" cy="36" r="6" />
            <path d="M38 36 h4" />
          </g>
          <g v-if="look.hat !== 'none'">
            <path v-if="look.hat === 'cap'" d="M22 24 h36 v6 h-36 z" fill="#c0392b" />
            <path v-if="look.hat === 'cap'" d="M22 24 q18-16 36 0" fill="#c0392b" />
            <path v-if="look.hat === 'beanie'" d="M24 26 q16-18 32 0 v6 h-32 z" fill="#2980b9" />
            <g v-if="look.hat === 'crown'">
              <path d="M22 24 l8 10 10-12 10 12 8-10 v16 h-36 z" fill="#f1c40f" />
            </g>
          </g>
        </g>
      </g>
    </svg>
    <div v-if="pose === 'ready'" class="drawn-hero__sword" aria-hidden="true">⚔️</div>
  </div>
</template>

<style scoped>
.drawn-hero {
  position: relative;
  width: calc(88px * var(--scale, 1));
  height: calc(150px * var(--scale, 1));
  transform-origin: bottom center;
  transition: transform 0.35s ease;
}

.drawn-hero--flip .drawn-hero__svg {
  transform: scaleX(-1);
}

.drawn-hero__svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.25));
}

.drawn-hero--walk .drawn-hero__leg--left {
  transform-origin: 33px 92px;
  animation: walk-right 0.56s linear infinite;
}

.drawn-hero--walk .drawn-hero__leg--right {
  transform-origin: 47px 92px;
  animation: walk-left 0.56s linear infinite;
}

.drawn-hero--walk .drawn-hero__arm--left {
  transform-origin: 19px 64px;
  animation: arm-left 0.56s linear infinite;
}

.drawn-hero--walk .drawn-hero__arm--right {
  transform-origin: 61px 64px;
  animation: arm-right 0.56s linear infinite;
}

.drawn-hero--ready .drawn-hero__arm--right {
  transform-origin: 61px 64px;
  transform: rotate(-110deg);
}

.drawn-hero--cheer {
  animation: hop 0.45s ease-in-out 2;
}

.drawn-hero--cheer .drawn-hero__arm--left {
  transform-origin: 19px 64px;
  transform: rotate(-150deg);
}

.drawn-hero--cheer .drawn-hero__arm--right {
  transform-origin: 61px 64px;
  transform: rotate(150deg);
}

.drawn-hero--fall,
.drawn-hero--lie {
  transform: translateY(calc(-22px * var(--scale, 1))) rotate(90deg);
}

.drawn-hero--getup {
  animation: rise 0.5s ease forwards;
}

.drawn-hero__stars,
.drawn-hero__trophy,
.drawn-hero__sword {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  text-shadow: 0 1px 0 #000;
}

.drawn-hero__stars {
  top: -8px;
  animation: twinkle 0.7s ease-in-out infinite;
}

.drawn-hero__trophy {
  top: -18px;
}

.drawn-hero__sword {
  top: 18px;
  right: -6px;
  left: auto;
}

@keyframes walk-left {
  0% { transform: rotate(28deg); }
  25% { transform: rotate(0deg) translateY(-7px); }
  50% { transform: rotate(-28deg); }
  75% { transform: rotate(0deg); }
  100% { transform: rotate(28deg); }
}

@keyframes walk-right {
  0% { transform: rotate(-28deg); }
  25% { transform: rotate(0deg); }
  50% { transform: rotate(28deg); }
  75% { transform: rotate(0deg) translateY(-7px); }
  100% { transform: rotate(-28deg); }
}

@keyframes arm-left {
  0% { transform: rotate(22deg); }
  50% { transform: rotate(-22deg); }
  100% { transform: rotate(22deg); }
}

@keyframes arm-right {
  0% { transform: rotate(-22deg); }
  50% { transform: rotate(22deg); }
  100% { transform: rotate(-22deg); }
}

@keyframes hop {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-18px); }
}

@keyframes rise {
  from { transform: translateY(calc(-22px * var(--scale, 1))) rotate(90deg); }
  to { transform: rotate(0) translate(0, 0); }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.4; transform: translateX(-50%) scale(0.9); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
}
</style>
