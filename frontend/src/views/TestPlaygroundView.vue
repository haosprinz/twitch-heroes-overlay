<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import OverlayPreview from "@/components/OverlayPreview.vue";
import TestLog, { type TestLogEntry } from "@/components/TestLog.vue";
import TestMessageForm from "@/components/TestMessageForm.vue";
import { useChatters } from "@/composables/useChatters";
import { useHeroes } from "@/composables/useHeroes";
import {
  emitTestMessage,
  emitTestResetOverlay,
  useWebSocket,
} from "@/composables/useWebSocket";
import { useChatStore, type ChatMessage } from "@/stores/chatStore";
import { useHeroStore } from "@/stores/heroStore";
import type { Chatter } from "@/types/chatter";

const LONG_TEXT =
  "Это очень длинное тестовое сообщение для проверки переполнения пузыря на оверлее. ".repeat(6) +
  "Нужно убедиться, что текст не ломает вёрстку и переносится внутри облака.";

const { ready } = useWebSocket();
const heroStore = useHeroStore();
const chatStore = useChatStore();
const { fetchHeroes } = useHeroes();
const { fetchChatters } = useChatters();

const text = ref("Привет, проверяю пузырь");
const heroId = ref<number | null>(null);
const chatterId = ref<number | null>(null);
const chatterName = ref("tester");
const duration = ref(5000);
const showIdle = ref(false);
const background = ref<"checker" | "dark">("checker");
const sending = ref(false);
const chatters = ref<Chatter[]>([]);
const log = ref<TestLogEntry[]>([]);
let logSeq = 0;

function heroNameById(id: number | null | undefined) {
  if (!id) return "случайный";
  return heroStore.heroes.find((hero) => hero.id === id)?.name ?? `#${id}`;
}

function payload(overrides: Partial<{ text: string }> = {}) {
  return {
    text: overrides.text ?? text.value,
    heroId: heroId.value,
    chatterId: chatterId.value,
    chatterName: chatterId.value ? undefined : chatterName.value.trim() || "tester",
    duration: duration.value,
  };
}

function appendLog(message: ChatMessage) {
  if (message.source !== "test") return;
  log.value = [
    {
      id: ++logSeq,
      timestamp: message.timestamp,
      username: message.username,
      message: message.message,
      heroName: heroNameById(message.heroId),
      duration: message.duration ?? duration.value,
    },
    ...log.value,
  ].slice(0, 20);
}

function sendOne(overrides: Partial<{ text: string }> = {}) {
  return emitTestMessage(payload(overrides));
}

function onSend() {
  sendOne();
}

async function onSpam() {
  sending.value = true;
  try {
    const count = 4;
    for (let i = 1; i <= count; i += 1) {
      sendOne({ text: `${text.value || "спам"} (${i})` });
      if (i < count) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } finally {
    sending.value = false;
  }
}

function onLongText() {
  text.value = LONG_TEXT;
}

function onActivate() {
  sendOne({ text: "" });
}

function onReset() {
  emitTestResetOverlay();
}

watch(
  () => chatStore.lastMessage,
  (message) => {
    if (message) appendLog(message);
  },
);

onMounted(async () => {
  try {
    heroStore.setHeroes(await fetchHeroes());
  } catch (error) {
    console.warn("Failed to load heroes", error);
  }
  try {
    const result = await fetchChatters(1, 100);
    chatters.value = result.chatters;
  } catch (error) {
    console.warn("Failed to load chatters", error);
  }
});
</script>

<template>
  <v-container fluid class="py-4">
    <h1 class="text-h5 mb-4">🧪 Тестирование</h1>
    <v-row>
      <v-col cols="12" md="5">
        <TestMessageForm
          v-model:text="text"
          v-model:hero-id="heroId"
          v-model:chatter-id="chatterId"
          v-model:chatter-name="chatterName"
          v-model:duration="duration"
          v-model:show-idle="showIdle"
          :heroes="heroStore.heroes"
          :chatters="chatters"
          :sending="sending"
          :disabled="!ready"
          @send="onSend"
          @spam="onSpam"
          @long-text="onLongText"
          @activate="onActivate"
          @reset="onReset"
        />
      </v-col>
      <v-col cols="12" md="7">
        <OverlayPreview v-model:background="background" :idle="showIdle" />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <TestLog :entries="log" @clear="log = []" />
      </v-col>
    </v-row>
  </v-container>
</template>
