<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import OverlayPreview from "@/components/OverlayPreview.vue";
import TestLog, { type TestLogEntry } from "@/components/TestLog.vue";
import TestMessageForm from "@/components/TestMessageForm.vue";
import { useHeroes } from "@/composables/useHeroes";
import { emitTestMessage, useWebSocket } from "@/composables/useWebSocket";
import type { HeroActivation } from "@/stores/chatStore";
import { useHeroStore } from "@/stores/heroStore";
import type { OverlaySlot, TestChatter } from "@/types/overlay";

const LONG_TEXT =
  "Это очень длинное тестовое сообщение для проверки переполнения пузыря на оверлее. ".repeat(
    6,
  ) +
  "Нужно убедиться, что текст не ломает вёрстку и переносится внутри облака.";

useWebSocket();
const heroStore = useHeroStore();
const { fetchHeroes } = useHeroes();

const showIdle = ref(false);
const background = ref<"checker" | "dark">("checker");
const sendingId = ref<number | null>(null);
const log = ref<TestLogEntry[]>([]);
const activations = ref<HeroActivation[]>([]);
let logSeq = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

const testChatters = ref<TestChatter[]>([
  {
    id: -1,
    username: "Пользователь 1",
    heroId: null,
    text: "Привет от Пользователя 1",
    duration: 5000,
  },
  {
    id: -2,
    username: "Пользователь 2",
    heroId: null,
    text: "Привет от Пользователя 2",
    duration: 8000,
  },
]);

const previewItems = computed<OverlaySlot[]>(() =>
  testChatters.value.flatMap((chatter) => {
    if (!chatter.heroId) return [];
    const hero = heroStore.heroes.find((item) => item.id === chatter.heroId);
    return hero ? [{ id: chatter.id, hero, username: chatter.username }] : [];
  }),
);

function heroNameById(id: number | null | undefined) {
  if (!id) return "нет героя";
  return heroStore.heroes.find((hero) => hero.id === id)?.name ?? `#${id}`;
}

function assignDefaultHeroes() {
  const heroes = heroStore.heroes;
  if (!heroes.length) return;
  testChatters.value = testChatters.value.map((chatter, index) => {
    if (chatter.heroId && heroes.some((hero) => hero.id === chatter.heroId)) {
      return chatter;
    }
    const hero = heroes[index] ?? heroes[0];
    return { ...chatter, heroId: hero.id };
  });
}

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
      heroName: heroNameById(chatter.heroId),
      duration: chatter.duration,
    },
    ...log.value,
  ].slice(0, 20);
}

function activateLocal(chatter: TestChatter, message: string) {
  if (!chatter.heroId) return;
  const chatterId = chatter.id;
  const activation: HeroActivation = {
    chatterId,
    username: chatter.username,
    heroId: chatter.heroId,
    message,
    timestamp: Date.now(),
  };
  activations.value = [
    ...activations.value.filter((item) => item.chatterId !== chatterId),
    activation,
  ];
  const previous = timers.get(chatterId);
  if (previous) clearTimeout(previous);
  timers.set(
    chatterId,
    setTimeout(() => {
      activations.value = activations.value.filter(
        (item) => item.chatterId !== chatterId,
      );
      timers.delete(chatterId);
    }, chatter.duration),
  );
}

function sendOne(chatterId: number, overrides: Partial<{ text: string }> = {}) {
  const current = chatterById(chatterId);
  if (!current?.heroId) return false;
  showIdle.value = false;
  const message = overrides.text ?? current.text;
  activateLocal(current, message);
  appendLog(current, message);
  emitTestMessage({
    text: message,
    heroId: current.heroId,
    chatterName: current.username,
    duration: current.duration,
  });
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

function onReset() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  activations.value = [];
}

watch(
  () => heroStore.heroes,
  () => assignDefaultHeroes(),
  { deep: true },
);

onMounted(async () => {
  try {
    heroStore.setHeroes(await fetchHeroes());
  } catch (error) {
    console.warn("Failed to load heroes", error);
  }
  assignDefaultHeroes();
});

onUnmounted(() => {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
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
          :heroes="heroStore.heroes"
          :sending-id="sendingId"
          @send="onSend"
          @spam="onSpam"
          @long-text="onLongText"
          @reset="onReset"
        />
      </v-col>
      <v-col cols="12" md="7">
        <OverlayPreview
          v-model:background="background"
          :idle="showIdle"
          :items="previewItems"
          :activations="activations"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <TestLog :entries="log" @clear="log = []" />
      </v-col>
    </v-row>
  </v-container>
</template>
