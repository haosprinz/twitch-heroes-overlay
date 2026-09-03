<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useChatters } from "@/composables/useChatters";
import { useHeroes } from "@/composables/useHeroes";
import { useWebSocket } from "@/composables/useWebSocket";
import { useChatterStore } from "@/stores/chatterStore";
import { useHeroStore } from "@/stores/heroStore";
import type { Chatter } from "@/types/chatter";

const chatterStore = useChatterStore();
const heroStore = useHeroStore();
const { fetchChatters, assignHero, removeHero } = useChatters();
const { fetchHeroes } = useHeroes();
useWebSocket();

const search = ref("");
const page = ref(1);
const limit = ref(25);
const loading = ref(false);
const error = ref("");
const assignTarget = ref<Chatter | null>(null);
const selectedHeroId = ref<number | null>(null);
const saving = ref(false);

const headers = [
  { title: "Имя", key: "displayName" },
  { title: "Логин", key: "username" },
  { title: "Герой", key: "hero" },
  { title: "Сообщения", key: "messageCount" },
  { title: "Последняя активность", key: "lastSeen" },
  { title: "", key: "actions", sortable: false },
];

let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const result = await fetchChatters(page.value, limit.value, search.value);
    chatterStore.setChatters(result.chatters, result.pagination);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось загрузить чаттеров";
  } finally {
    loading.value = false;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function openAssign(chatter: Chatter) {
  assignTarget.value = chatter;
  selectedHeroId.value = chatter.heroId;
}

async function saveAssign() {
  if (!assignTarget.value || !selectedHeroId.value) return;
  saving.value = true;
  try {
    await assignHero(assignTarget.value.id, selectedHeroId.value);
    assignTarget.value = null;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось назначить героя";
  } finally {
    saving.value = false;
  }
}

async function clearHero(chatter: Chatter) {
  try {
    await removeHero(chatter.id);
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось убрать героя";
  }
}

watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    void load();
  }, 300);
});

watch([page, limit], () => {
  void load();
});

onMounted(async () => {
  try {
    heroStore.setHeroes(await fetchHeroes());
  } catch {
    /* overlay/admin already load heroes */
  }
  await load();
});
</script>

<template>
  <v-container>
    <h1 class="text-h4 mb-4">Чаттеры</h1>
    <v-text-field
      v-model="search"
      label="Поиск по имени или логину"
      variant="outlined"
      density="compact"
      class="mb-4"
      clearable
    />
    <v-alert v-if="error" type="warning" class="mb-4">{{ error }}</v-alert>
    <v-data-table-server
      v-model:page="page"
      v-model:items-per-page="limit"
      :headers="headers"
      :items="chatterStore.chatters"
      :items-length="chatterStore.pagination.total"
      :loading="loading"
      item-value="id"
    >
      <template #item.displayName="{ item }">
        {{ item.displayName || item.username }}
      </template>
      <template #item.hero="{ item }">
        {{ item.hero?.name || "—" }}
      </template>
      <template #item.messageCount="{ item }">
        {{ item.messageCount ?? 0 }}
      </template>
      <template #item.lastSeen="{ item }">
        {{ formatDate(item.lastSeen) }}
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openAssign(item)">Герой</v-btn>
        <v-btn v-if="item.heroId" size="small" variant="text" color="error" @click="clearHero(item)">
          Убрать
        </v-btn>
      </template>
      <template #no-data>
        Пока нет чаттеров. Данные появятся после EventSub.
      </template>
    </v-data-table-server>

    <v-dialog :model-value="Boolean(assignTarget)" max-width="420" @update:model-value="(open) => { if (!open) assignTarget = null }">
      <v-card v-if="assignTarget">
        <v-card-title>Назначить героя</v-card-title>
        <v-card-text>
          <p class="mb-4">{{ assignTarget.displayName || assignTarget.username }}</p>
          <v-select
            v-model="selectedHeroId"
            :items="heroStore.heroes"
            item-title="name"
            item-value="id"
            label="Герой"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="assignTarget = null">Отмена</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!selectedHeroId" @click="saveAssign">
            Назначить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
