<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";
import { useWebSocket } from "@/composables/useWebSocket";

const appStore = useAppStore();
const chatStore = useChatStore();
useWebSocket();
const route = useRoute();
const router = useRouter();
const authUrl = `${appStore.apiUrl}/api/auth/twitch`;
const alert = ref<{ type: "success" | "error"; text: string } | null>(null);

const eventSubColor = computed(() => {
  switch (chatStore.eventSubStatus) {
    case "connected":
      return "success";
    case "connecting":
      return "info";
    case "error":
      return "error";
    default:
      return "warning";
  }
});

const eventSubLabel = computed(() => {
  switch (chatStore.eventSubStatus) {
    case "connected":
      return "EventSub подключён — сообщения чата идут в реальном времени";
    case "connecting":
      return "EventSub подключается…";
    case "error":
      return "Ошибка EventSub. Войдите через Twitch ещё раз и проверьте права чата.";
    default:
      return "EventSub отключён. Авторизуйтесь через Twitch, чтобы получать чат.";
  }
});

const chatFeed = computed(() =>
  chatStore.recentMessages.filter((item) => item.source !== "test"),
);

function formatMessageDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("ru-RU");
}

function formatMessageTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("ru-RU");
}

function applyAuthQuery() {
  const auth = String(route.query.auth || "");
  if (auth === "success") {
    alert.value = {
      type: "success",
      text: "Авторизация через Twitch прошла успешно. EventSub сейчас подключается к чату.",
    };
  } else if (auth === "error") {
    alert.value = {
      type: "error",
      text: String(route.query.message || "Не удалось авторизоваться через Twitch."),
    };
  }
}

onMounted(async () => {
  applyAuthQuery();
  await appStore.loadSettings();
  if (route.query.auth) {
    router.replace({ path: "/", query: {} });
  }
});

watch(
  () => route.query.auth,
  () => applyAuthQuery(),
);
</script>

<template>
  <v-container class="py-12">
    <h1 class="text-h3 mb-4">Twitch Heroes Overlay</h1>
    <p class="text-body-1 mb-6">
      Overlay для OBS: рисованные герои патрулируют сцену, дуэли запускаются командой
      <code>\duel ник</code> в чате. Вкладка «Пользователи» показывает счёт побед и поражений.
    </p>

    <v-alert v-if="alert" :type="alert.type" class="mb-6" closable @click:close="alert = null">
      {{ alert.text }}
    </v-alert>

    <v-alert v-if="appStore.settingsError" type="error" class="mb-6">
      Не удалось получить настройки backend: {{ appStore.settingsError }}
    </v-alert>

    <v-alert :type="eventSubColor" class="mb-6" variant="tonal">
      {{ eventSubLabel }}
    </v-alert>

    <v-row v-if="appStore.stats" class="mb-6" dense>
      <v-col cols="6" md="3">
        <v-card variant="tonal"><v-card-text>Пользователи: {{ appStore.stats.totalChatters }}</v-card-text></v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal"><v-card-text>Герои: {{ appStore.stats.totalHeroes }}</v-card-text></v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal"><v-card-text>Сообщения: {{ appStore.stats.totalMessages }}</v-card-text></v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal">
          <v-card-text>
            Топ герой: {{ appStore.stats.mostPopularHero?.name || "—" }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-if="appStore.twitchConnected" class="mb-6" variant="tonal">
      <v-card-title>Стример подключён</v-card-title>
      <v-card-text class="d-flex align-center ga-4">
        <v-avatar v-if="appStore.settings.twitch_profile_image_url" size="48">
          <v-img :src="appStore.settings.twitch_profile_image_url" alt="" />
        </v-avatar>
        <div>
          <div class="text-h6">{{ appStore.twitchUsername }}</div>
          <div class="text-medium-emphasis">
            broadcaster_id: {{ appStore.settings.twitch_broadcaster_id }}
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn :href="authUrl" variant="text">Войти снова</v-btn>
      </v-card-actions>
    </v-card>

    <template v-else>
      <v-alert
        v-if="appStore.settingsLoaded && !appStore.twitchConfigured"
        type="warning"
        class="mb-6"
        title="Сначала зарегистрируйте приложение Twitch"
      >
        <ol class="mt-2 pl-4">
          <li>
            Откройте
            <a href="https://dev.twitch.tv/console" target="_blank" rel="noreferrer">
              Twitch Developer Console
            </a>
          </li>
          <li>Register Your Application</li>
          <li>
            OAuth Redirect URL:
            <code>http://localhost:3000/api/auth/twitch/callback</code>
          </li>
          <li>Скопируйте Client ID и Client Secret в <code>backend/.env</code></li>
          <li>Перезапустите backend и нажмите кнопку входа</li>
        </ol>
      </v-alert>

      <v-btn
        color="purple"
        size="large"
        :href="authUrl"
        :disabled="appStore.settingsLoaded && !appStore.twitchConfigured"
      >
        Авторизоваться через Twitch
      </v-btn>
    </template>

    <v-card class="mt-8">
      <v-card-title>Последние сообщения чата</v-card-title>
      <v-card-text>
        <v-list v-if="chatFeed.length">
          <v-list-item
            v-for="item in chatFeed"
            :key="`${item.chatterId}-${item.timestamp}`"
          >
            <v-list-item-title>
              {{ item.username }}
              <span class="text-medium-emphasis font-weight-regular ml-2">
                {{ formatMessageDate(item.timestamp) }}
                {{ formatMessageTime(item.timestamp) }}
              </span>
            </v-list-item-title>
            <v-list-item-subtitle class="text-wrap">{{ item.message }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <p v-else class="text-medium-emphasis">
          Сообщений пока нет. После входа через Twitch напишите что-нибудь в чат канала.
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>
