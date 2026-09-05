<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import ChatBubble from "@/components/ChatBubble.vue";
import DrawnHero from "@/components/DrawnHero.vue";
import { useChatStore, type HeroActivation } from "@/stores/chatStore";
import { useDuelStore } from "@/stores/duelStore";
import type { ActiveDuel } from "@/types/duel";
import type { OverlaySlot } from "@/types/overlay";

const idleDuel = (): ActiveDuel => ({
  phase: "idle",
  challengerId: null,
  opponentId: null,
  winnerId: null,
  loserId: null,
  countdown: null,
});

const props = defineProps<{
  items: OverlaySlot[];
  idle?: boolean;
  embedded?: boolean;
  activations?: HeroActivation[];
  duel?: ActiveDuel | null;
  isolated?: boolean;
}>();

const chatStore = useChatStore();
const duelStore = useDuelStore();
const stageRef = ref<HTMLElement | null>(null);
const nowMs = ref(Date.now());
const resultStartedAt = ref(0);
const getupUntil = reactive(new Map<number, number>());
const motions = reactive(
  new Map<
    number,
    { x: number; dir: 1 | -1; pose: "walk" | "ready" | "fall" | "lie" | "getup" | "cheer" | "idle" }
  >(),
);

const activeDuel = computed<ActiveDuel>(() => {
  if (props.isolated) return props.duel ?? idleDuel();
  return props.duel ?? duelStore.duel;
});

const activeMap = computed(() => {
  const map = new Map<number, { message: string }>();
  if (props.idle) return map;
  const list = props.activations ?? chatStore.activations;
  for (const item of list) {
    if (item.chatterId) map.set(item.chatterId, { message: item.message });
  }
  return map;
});

function knockoutActive(until?: string | null) {
  return Boolean(until && new Date(until).getTime() > nowMs.value);
}

function isSlotLying(id: number) {
  const item = props.items.find((slot) => slot.id === id);
  if (item?.lyingUntil) return knockoutActive(item.lyingUntil);
  if (!props.isolated && duelStore.isLying(id, nowMs.value)) return true;
  return item?.status === "lying";
}

function poseFor(id: number): "walk" | "ready" | "fall" | "lie" | "getup" | "cheer" | "idle" {
  const duel = activeDuel.value;
  if (duel.phase === "ready" || duel.phase === "countdown") {
    if (id === duel.challengerId || id === duel.opponentId) return "ready";
  }
  if (duel.phase === "result") {
    const elapsed = nowMs.value - resultStartedAt.value;
    if (id === duel.winnerId) return elapsed < 1600 ? "cheer" : "walk";
    if (id === duel.loserId) {
      if (elapsed < 450) return "fall";
      if (isSlotLying(id)) return "lie";
    }
  }
  if (isSlotLying(id)) return "lie";
  const current = motions.get(id);
  return current?.pose === "getup" ? "getup" : "walk";
}

const EDGE_GAP = 50;
const HERO_HALF = 80;

function leftLimit() {
  return EDGE_GAP + HERO_HALF;
}

function rightLimit(width: number) {
  return Math.max(leftLimit() + 20, width - EDGE_GAP - HERO_HALF);
}

function isDuelist(id: number) {
  const duel = activeDuel.value;
  if (duel.phase === "idle") return false;
  return id === duel.challengerId || id === duel.opponentId;
}

function duelCornerX(id: number, width: number) {
  return id === activeDuel.value.challengerId ? leftLimit() : rightLimit(width);
}

function ensureMotion(id: number, width: number) {
  if (motions.has(id)) return;
  const minX = leftLimit();
  const maxX = rightLimit(width);
  const span = Math.max(20, maxX - minX);
  motions.set(id, {
    x: minX + Math.random() * span,
    dir: Math.random() < 0.5 ? 1 : -1,
    pose: "walk",
  });
}

let frame = 0;
function tick(now: number) {
  frame = requestAnimationFrame(tick);
  nowMs.value = Date.now();
  const width = stageRef.value?.clientWidth || 1280;
  const duel = activeDuel.value;
  const dt = 16;
  const resultElapsed = nowMs.value - resultStartedAt.value;
  const winnerDoneCheering =
    duel.phase === "result" && resultElapsed >= 1600;

  for (const slot of props.items) {
    ensureMotion(slot.id, width);
    const motion = motions.get(slot.id);
    if (!motion) continue;
    const speed = (slot.hero.config?.speed || 1) * 0.055 * dt;
    const inDuel = slot.id === duel.challengerId || slot.id === duel.opponentId;
    const wasDown = motion.pose === "fall" || motion.pose === "lie";
    const loserDown =
      isSlotLying(slot.id) ||
      (duel.phase === "result" && slot.id === duel.loserId && resultElapsed < 450);

    if (loserDown) {
      motion.pose = resultElapsed < 450 && slot.id === duel.loserId ? "fall" : "lie";
      continue;
    }

    if (wasDown) {
      motion.pose = "getup";
      getupUntil.set(slot.id, nowMs.value + 500);
      continue;
    }

    if ((getupUntil.get(slot.id) ?? 0) > nowMs.value) {
      motion.pose = "getup";
      continue;
    }
    getupUntil.delete(slot.id);

    if (
      !props.isolated &&
      slot.lyingUntil &&
      new Date(slot.lyingUntil).getTime() <= nowMs.value &&
      (slot.status === "lying" || (duel.phase === "result" && slot.id === duel.loserId))
    ) {
      duelStore.revive(slot.id);
    }

    if (duel.phase !== "idle" && inDuel && !(winnerDoneCheering && slot.id === duel.winnerId)) {
      const target = duelCornerX(slot.id, width);
      if (duel.phase === "start") {
        motion.pose = "walk";
        const delta = target - motion.x;
        motion.dir = delta >= 0 ? 1 : -1;
        if (Math.abs(delta) > 4) {
          motion.x += Math.sign(delta) * Math.min(Math.abs(delta), speed * 3.1);
        }
      } else if (duel.phase === "ready" || duel.phase === "countdown") {
        motion.pose = "ready";
        motion.dir = slot.id === duel.challengerId ? 1 : -1;
        motion.x += (target - motion.x) * 0.18;
      } else if (duel.phase === "result") {
        motion.pose = "cheer";
        motion.x += (target - motion.x) * 0.1;
      }
      continue;
    }

    motion.pose = "walk";
    motion.x += motion.dir * speed;
    const minX = leftLimit();
    const maxX = rightLimit(width);
    if (motion.x <= minX) {
      motion.x = minX;
      motion.dir = 1;
    } else if (motion.x >= maxX) {
      motion.x = maxX;
      motion.dir = -1;
    }
  }

  void now;
}

watch(
  () => [activeDuel.value.phase, activeDuel.value.loserId] as const,
  ([phase], [prevPhase, prevLoser]) => {
    if (phase === "result") resultStartedAt.value = Date.now();
    if (phase === "idle" && prevPhase === "result" && prevLoser) {
      const loser = motions.get(prevLoser);
      if (loser) loser.pose = "getup";
    }
  },
  { flush: "sync" },
);

onMounted(() => {
  frame = requestAnimationFrame(tick);
});

onUnmounted(() => {
  cancelAnimationFrame(frame);
});
</script>

<template>
  <div ref="stageRef" class="overlay" :class="{ 'overlay--embedded': embedded }">
    <div
      v-if="activeDuel.phase === 'countdown' && activeDuel.countdown"
      class="overlay__countdown"
    >
      {{ activeDuel.countdown }}
    </div>
    <div
      v-for="slot in items"
      :key="slot.id"
      class="overlay__hero"
      :class="{ 'overlay__hero--front': isDuelist(slot.id) }"
      :style="{
        left: `${(motions.get(slot.id)?.x ?? 80)}px`,
        zIndex: isDuelist(slot.id) ? 8 : 1,
      }"
    >
      <Transition name="bubble">
        <ChatBubble
          v-if="activeMap.get(slot.id) && !isSlotLying(slot.id) && poseFor(slot.id) !== 'lie'"
          :hero="slot.hero"
          :message="activeMap.get(slot.id)!.message"
        />
      </Transition>
      <div class="overlay__user-name">{{ slot.username }}</div>
      <DrawnHero
        :hero="slot.hero"
        :pose="poseFor(slot.id)"
        :facing="motions.get(slot.id)?.dir ?? 1"
      />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: transparent;
}

.overlay--embedded {
  min-height: 0;
  height: 100%;
}

.overlay__hero {
  position: absolute;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
  transform-origin: bottom center;
  pointer-events: none;
  transition: transform 0.4s ease;
}

.overlay__hero--front {
  z-index: 8;
  transform: translateX(-50%) scale(1.32);
}

.overlay__user-name {
  max-width: 160px;
  margin-bottom: 4px;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
  word-break: break-word;
}

.overlay__countdown {
  position: absolute;
  left: 50%;
  bottom: calc(18px + 150px + 4px);
  z-index: 10;
  color: #fff;
  font-size: 36px;
  font-weight: 900;
  line-height: 1.2;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 4px 0 #000;
  transform: translateX(-50%);
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
