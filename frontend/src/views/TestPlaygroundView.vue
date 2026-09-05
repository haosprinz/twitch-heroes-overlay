<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import OverlayPreview from "@/components/OverlayPreview.vue";
import TestLog, { type TestLogEntry } from "@/components/TestLog.vue";
import TestMessageForm from "@/components/TestMessageForm.vue";
import {
  TEST_CHATTER_1_ID,
  TEST_CHATTER_2_ID,
  createTestChatters,
} from "@/data/testPlayground";
import type { HeroActivation } from "@/stores/chatStore";
import type { ActiveDuel } from "@/types/duel";
import type { OverlaySlot, TestChatter } from "@/types/overlay";

const LONG_TEXT =
  "Это очень длинное тестовое сообщение для проверки переполнения пузыря на оверлее. ".repeat(
    6,
  ) +
  "Нужно убедиться, что текст не ломает вёрстку и переносится внутри облака.";

const idleDuel = (): ActiveDuel => ({
  phase: "idle",
  challengerId: null,
  opponentId: null,
  winnerId: null,
  loserId: null,
  countdown: null,
});

const showIdle = ref(false);
const background = ref<"checker" | "dark">("checker");
const sendingId = ref<number | null>(null);
const log = ref<TestLogEntry[]>([]);
const activations = ref<HeroActivation[]>([]);
const testChatters = ref<TestChatter[]>(createTestChatters());
const localDuel = ref<ActiveDuel>(idleDuel());
const lyingUntil = ref<Record<number, string | null>>({});
const testRecord = ref<Record<number, { wins: number; losses: number }>>({});
const recentTestWinners = ref<number[]>([]);
let logSeq = 0;
const bubbleTimers = new Map<number, ReturnType<typeof setTimeout>>();
const duelTimers: ReturnType<typeof setTimeout>[] = [];

const previewItems = computed<OverlaySlot[]>(() =>
  testChatters.value.map((chatter) => {
    const duel = localDuel.value;
    const inPair = chatter.id === duel.challengerId || chatter.id === duel.opponentId;
    let status: OverlaySlot["status"] = "patrol";
    if (chatter.id === duel.loserId || lyingUntil.value[chatter.id]) status = "lying";
    else if (inPair && duel.phase !== "idle" && duel.phase !== "result") status = "duel";
    return {
      id: chatter.id,
      hero: chatter.hero,
      username: chatter.username,
      status,
      lyingUntil: lyingUntil.value[chatter.id] ?? null,
    };
  }),
);

function chatterById(chatterId: number) {
  return testChatters.value.find((item) => item.id === chatterId);
}

function appendLog(chatter: TestChatter, message: string) {
  log.value = [
    {
      id: ++logSeq,
      timestamp: Date.now(),
      username: chatter.username,
      message,
      heroName: chatter.username,
      duration: chatter.duration,
    },
    ...log.value,
  ].slice(0, 20);
}

function activateLocal(chatter: TestChatter, message: string) {
  const chatterId = chatter.id;
  const activation: HeroActivation = {
    chatterId,
    username: chatter.username,
    heroId: chatter.hero.id,
    message,
    timestamp: Date.now(),
  };
  activations.value = [
    ...activations.value.filter((item) => item.chatterId !== chatterId),
    activation,
  ];
  const previous = bubbleTimers.get(chatterId);
  if (previous) clearTimeout(previous);
  bubbleTimers.set(
    chatterId,
    setTimeout(() => {
      activations.value = activations.value.filter((item) => item.chatterId !== chatterId);
      bubbleTimers.delete(chatterId);
    }, chatter.duration),
  );
}

function sendOne(chatterId: number, overrides: Partial<{ text: string }> = {}) {
  const current = chatterById(chatterId);
  if (!current) return false;
  if (lyingUntil.value[chatterId]) return false;
  showIdle.value = false;
  const message = overrides.text ?? current.text;
  activateLocal(current, message);
  appendLog(current, message);
  return true;
}

function onSend(chatterId: number) {
  sendOne(chatterId);
}

async function onSpam(chatterId: number) {
  const current = chatterById(chatterId);
  if (!current) return;
  sendingId.value = chatterId;
  try {
    const count = 4;
    for (let i = 1; i <= count; i += 1) {
      sendOne(chatterId, { text: `${current.text || "спам"} (${i})` });
      if (i < count) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } finally {
    sendingId.value = null;
  }
}

function onLongText(chatterId: number) {
  const current = chatterById(chatterId);
  if (!current) return;
  current.text = LONG_TEXT;
}

function clearDuelTimers() {
  while (duelTimers.length) {
    const timer = duelTimers.pop();
    if (timer) clearTimeout(timer);
  }
}

function later(ms: number, fn: () => void) {
  const timer = setTimeout(() => {
    const index = duelTimers.indexOf(timer);
    if (index >= 0) duelTimers.splice(index, 1);
    fn();
  }, ms);
  duelTimers.push(timer);
}

function testWeight(id: number): number {
  const record = testRecord.value[id] ?? { wins: 0, losses: 0 };
  let streak = 0;
  for (const winner of recentTestWinners.value) {
    if (winner !== id) break;
    streak += 1;
  }
  const underdog = 1 + Math.max(0, record.losses - record.wins) * 0.16;
  const streakPenalty = 1 / (1 + streak * 0.45);
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const jitter = 0.88 + (bytes[0] % 250) / 1000;
  return Math.max(0.12, underdog * streakPenalty * jitter);
}

function pickTestWinner(challengerId: number, opponentId: number): number {
  const left = testWeight(challengerId);
  const right = testWeight(opponentId);
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] / 0x1_0000_0000 * (left + right) < left ? challengerId : opponentId;
}

function someoneIsLying() {
  return Object.values(lyingUntil.value).some(
    (until) => until && new Date(until).getTime() > Date.now(),
  );
}

function onDuel() {
  const phase = localDuel.value.phase;
  if (phase === "start" || phase === "ready" || phase === "countdown") return;
  if (someoneIsLying() || phase === "result") {
    const down = testChatters.value.find((item) => lyingUntil.value[item.id]);
    log.value = [
      {
        id: ++logSeq,
        timestamp: Date.now(),
        username: "система",
        message: `${down?.username ?? "Кто-то"} ещё лежит`,
        heroName: "дуэль",
        duration: 0,
      },
      ...log.value,
    ].slice(0, 20);
    return;
  }

  clearDuelTimers();
  const a = TEST_CHATTER_1_ID;
  const b = TEST_CHATTER_2_ID;
  localDuel.value = {
    phase: "start",
    challengerId: a,
    opponentId: b,
    winnerId: null,
    loserId: null,
    countdown: null,
  };
  log.value = [
    {
      id: ++logSeq,
      timestamp: Date.now(),
      username: "Пользователь 1",
      message: "\\duel Пользователь 2",
      heroName: "дуэль",
      duration: 0,
    },
    ...log.value,
  ].slice(0, 20);

  later(2000, () => {
    localDuel.value = { ...localDuel.value, phase: "ready" };
    later(500, () => {
      [3, 2, 1].forEach((value, index) => {
        later(index * 1000, () => {
          localDuel.value = { ...localDuel.value, phase: "countdown", countdown: value };
          if (value !== 1) return;
          later(280, () => {
            const winnerId = pickTestWinner(a, b);
            const loserId = winnerId === a ? b : a;
            const winnerRec = testRecord.value[winnerId] ?? { wins: 0, losses: 0 };
            const loserRec = testRecord.value[loserId] ?? { wins: 0, losses: 0 };
            testRecord.value = {
              ...testRecord.value,
              [winnerId]: { ...winnerRec, wins: winnerRec.wins + 1 },
              [loserId]: { ...loserRec, losses: loserRec.losses + 1 },
            };
            recentTestWinners.value = [winnerId, ...recentTestWinners.value].slice(0, 12);
            lyingUntil.value = { [loserId]: new Date(Date.now() + 8000).toISOString() };
            localDuel.value = {
              phase: "result",
              challengerId: a,
              opponentId: b,
              winnerId,
              loserId,
              countdown: null,
            };
            later(8000, () => {
              lyingUntil.value = {};
              localDuel.value = idleDuel();
            });
          });
        });
      });
    });
  });
}

function onReset() {
  for (const timer of bubbleTimers.values()) clearTimeout(timer);
  bubbleTimers.clear();
  activations.value = [];
  clearDuelTimers();
  lyingUntil.value = {};
  testRecord.value = {};
  recentTestWinners.value = [];
  localDuel.value = idleDuel();
}

onUnmounted(() => {
  for (const timer of bubbleTimers.values()) clearTimeout(timer);
  bubbleTimers.clear();
  clearDuelTimers();
});
</script>

<template>
  <v-container fluid class="py-4">
    <h1 class="text-h5 mb-4">🧪 Тестирование</h1>
    <v-row>
      <v-col cols="12" md="5">
        <TestMessageForm
          v-model:chatters="testChatters"
          v-model:show-idle="showIdle"
          :sending-id="sendingId"
          @send="onSend"
          @spam="onSpam"
          @long-text="onLongText"
          @reset="onReset"
        />
        <v-card class="mt-4" variant="outlined">
          <v-card-title>Симуляция дуэли</v-card-title>
          <v-card-text>
            <p class="text-body-2 mb-3">
              Дуэль только между Пользователем 1 и Пользователем 2. Никнеймы и внешность заданы жёстко.
            </p>
            <v-btn color="primary" @click="onDuel">\duel</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="7">
        <OverlayPreview
          v-model:background="background"
          isolated
          :idle="showIdle"
          :items="previewItems"
          :activations="activations"
          :duel="localDuel"
        />
        <TestLog class="mt-4" :entries="log" @clear="log = []" />
      </v-col>
    </v-row>
  </v-container>
</template>
