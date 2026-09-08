<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useAppStore } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";
import { useWebSocket } from "@/composables/useWebSocket";

const route = useRoute();
const appStore = useAppStore();
const chatStore = useChatStore();
const isOverlay = computed(() => Boolean(route.meta.overlay));
useWebSocket();

watch(
  isOverlay,
  (value) => {
    document.documentElement.classList.toggle("obs-overlay", value);
  },
  { immediate: true },
);

onMounted(() => {
  if (!isOverlay.value) {
    void appStore.loadSettings();
  }
});

const eventSubChipColor = computed(() => {
  if (chatStore.eventSubStatus === "connected") return "success";
  if (chatStore.eventSubStatus === "error") return "error";
  return "default";
});
</script>

<template>
  <v-app :class="{ overlay: isOverlay }">
    <v-app-bar v-if="!isOverlay" color="primary">
      <v-app-bar-title>Twitch Heroes</v-app-bar-title>
      <v-btn to="/" variant="text">Главная</v-btn>
      <v-btn to="/admin" variant="text">Герои</v-btn>
      <v-btn to="/test" variant="text">🧪 Тестирование</v-btn>
      <v-btn to="/extension" variant="text">Расширение</v-btn>
      <v-btn to="/chatters" variant="text">Пользователи</v-btn>
      <v-btn to="/overlay" variant="text">Overlay</v-btn>
      <v-spacer />
      <v-chip v-if="appStore.twitchConnected" class="mr-2" variant="flat" size="small">
        {{ appStore.twitchUsername }}
      </v-chip>
      <v-chip
        v-if="!isOverlay"
        class="mr-4"
        variant="flat"
        size="small"
        :color="eventSubChipColor"
      >
        EventSub: {{ chatStore.eventSubStatus }}
      </v-chip>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<style>
html,
body,
#app {
  min-height: 100%;
}

.overlay.v-application {
  background: transparent !important;
}

html.obs-overlay,
html.obs-overlay body,
html.obs-overlay #app {
  background: transparent !important;
}
</style>
