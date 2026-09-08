<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import HeroForm from "@/components/HeroForm.vue";
import { useAppStore } from "@/stores/appStore";
import { useMyHero } from "@/composables/useMyHero";
import type { Hero, HeroConfig } from "@/types/hero";

const appStore = useAppStore();
const { fetchMyHero, createMyHero, saveMyHero } = useMyHero();

const twitchId = ref("10001");
const username = ref("preview_user");
const displayName = ref("Preview User");
const hero = ref<Hero | null>(null);
const loading = ref(false);
const saving = ref(false);
const creating = ref(false);
const error = ref("");
const checked = ref(false);

const auth = computed(() => ({
  twitchId: twitchId.value.trim(),
  username: username.value.trim(),
  displayName: displayName.value.trim(),
}));

async function load() {
  if (!auth.value.twitchId) {
    error.value = "Укажите Twitch ID";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const result = await fetchMyHero(auth.value);
    hero.value = result.hero;
    checked.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось загрузить героя";
  } finally {
    loading.value = false;
  }
}

async function create() {
  if (!auth.value.twitchId) {
    error.value = "Укажите Twitch ID";
    return;
  }
  creating.value = true;
  error.value = "";
  try {
    const result = await createMyHero(auth.value);
    hero.value = result.hero;
    checked.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось создать героя";
  } finally {
    creating.value = false;
  }
}

async function save(payload: { name: string; config: HeroConfig } & Record<string, unknown>) {
  saving.value = true;
  error.value = "";
  try {
    hero.value = await saveMyHero(auth.value, payload);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось сохранить героя";
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await appStore.loadSettings();
});
</script>

<template>
  <v-container>
    <h1 class="text-h4 mb-2">Расширение</h1>
    <p class="text-medium-emphasis mb-4">
      У каждого зрителя свой герой. Здесь локальный предпросмотр панели:
      тот же API <code>/api/me/hero</code>, что вызывает Twitch Extension.
      Боевая панель — отдельный проект <code>extension/</code> на порту 5174.
    </p>

    <v-alert
      v-if="appStore.settings.extension_configured"
      type="success"
      variant="tonal"
      class="mb-4"
    >
      JWT расширения настроен. На канале зритель входит через Twitch Helper.
    </v-alert>
    <v-alert v-else type="info" variant="tonal" class="mb-4">
      Сейчас включён локальный обход JWT. Для панели на Twitch добавьте
      <code>TWITCH_EXTENSION_SECRET</code> в <code>backend/.env</code>.
    </v-alert>

    <v-card class="mb-6" variant="outlined">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="twitchId" label="Twitch user id" variant="outlined" hide-details />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="username" label="Логин" variant="outlined" hide-details />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="displayName" label="Отображаемое имя" variant="outlined" hide-details />
          </v-col>
        </v-row>
        <div class="d-flex ga-2 mt-4">
          <v-btn color="primary" :loading="creating" :disabled="loading" @click="create">
            Создать
          </v-btn>
          <v-btn variant="tonal" :loading="loading" :disabled="creating" @click="load">
            Проверить
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading && !hero" indeterminate class="mb-4" />

    <v-alert v-if="checked && !hero && !loading && !error" type="info" variant="tonal" class="mb-4">
      Героя ещё нет. Нажмите «Создать», чтобы завести пользователя и персонажа.
    </v-alert>

    <v-card v-if="hero" max-width="780">
      <v-card-title>Мой герой</v-card-title>
      <v-card-text>
        <HeroForm :hero="hero" :saving="saving" :error="error" @save="save" @cancel="load" />
      </v-card-text>
    </v-card>
  </v-container>
</template>
