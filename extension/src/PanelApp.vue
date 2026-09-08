<script setup lang="ts">
import { onMounted, ref } from "vue";
import HeroEditor from "./HeroEditor.vue";
import { createMyHero, fetchMyHero, saveMyHero, type ViewerAuth } from "./api";
import type { Hero, HeroConfig } from "./types";

const hero = ref<Hero | null>(null);
const error = ref("");
const saving = ref(false);
const loading = ref(true);
const creating = ref(false);
const missingHero = ref(false);
const needsIdentity = ref(false);
const localMode = ref(false);
const auth = ref<ViewerAuth | null>(null);

function applyTheme(theme?: string) {
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
}

async function loadHero(nextAuth: ViewerAuth) {
  loading.value = true;
  error.value = "";
  needsIdentity.value = false;
  missingHero.value = false;
  try {
    auth.value = nextAuth;
    hero.value = await fetchMyHero(nextAuth);
    missingHero.value = !hero.value;
  } catch (err) {
    const code = (err as Error & { code?: string }).code;
    if (code === "identity_required") {
      needsIdentity.value = true;
      error.value = "Разрешите расширению видеть ваш Twitch аккаунт, чтобы править героя.";
    } else {
      error.value = err instanceof Error ? err.message : "Не удалось загрузить героя";
    }
  } finally {
    loading.value = false;
  }
}

async function create() {
  if (!auth.value) return;
  creating.value = true;
  error.value = "";
  try {
    hero.value = await createMyHero(auth.value);
    missingHero.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось создать героя";
  } finally {
    creating.value = false;
  }
}

async function save(payload: { name: string; config: HeroConfig } & Record<string, unknown>) {
  if (!auth.value) return;
  saving.value = true;
  error.value = "";
  try {
    hero.value = await saveMyHero(auth.value, payload);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось сохранить";
  } finally {
    saving.value = false;
  }
}

function requestIdentity() {
  window.Twitch?.ext.actions.requestIdShare();
}

onMounted(() => {
  const twitch = window.Twitch?.ext;
  if (!twitch) {
    localMode.value = true;
    void loadHero({
      token: "dev",
      twitchId: "10001",
      username: "preview_user",
      displayName: "Preview User",
    });
    return;
  }

  twitch.onContext((context) => {
    applyTheme(context.theme);
  });

  twitch.onAuthorized((session) => {
    if (!twitch.viewer.isLinked || !twitch.viewer.id) {
      needsIdentity.value = true;
      loading.value = false;
      error.value = "Разрешите расширению видеть ваш Twitch аккаунт.";
      return;
    }
    void loadHero({
      token: session.token,
      twitchId: twitch.viewer.id,
    });
  });
});
</script>

<template>
  <main class="panel">
    <header>
      <h1>Мой герой</h1>
      <p v-if="localMode">Локальный предпросмотр панели без Twitch Helper.</p>
    </header>

    <p v-if="loading">Загрузка…</p>
    <p v-else-if="needsIdentity">
      Чтобы менять своего человечка, поделитесь ником Twitch.
      <button type="button" class="ghost" @click="requestIdentity">Разрешить</button>
    </p>
    <template v-else-if="missingHero && !hero">
      <p>Героя ещё нет. Создайте своего человечка для оверлея.</p>
      <button type="button" class="ghost" :disabled="creating" @click="create">
        {{ creating ? "Создание…" : "Создать" }}
      </button>
    </template>
    <p v-else-if="error && !hero" class="error">{{ error }}</p>

    <HeroEditor
      v-if="hero && !needsIdentity"
      :hero="hero"
      :saving="saving"
      :error="error"
      @save="save"
    />
  </main>
</template>

<style scoped>
.panel {
  min-height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

h1 {
  margin: 0 0 4px;
  font-size: 18px;
}

header p,
.panel > p {
  margin: 0 0 12px;
  font-size: 13px;
  opacity: 0.8;
}

.error {
  color: #e74c3c;
}

.ghost {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  border: 0;
  border-radius: 6px;
  background: #9146ff;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
</style>
