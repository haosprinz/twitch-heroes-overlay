<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useChatters } from "@/composables/useChatters";
import { useHeroes } from "@/composables/useHeroes";
import { useWebSocket } from "@/composables/useWebSocket";
import { useChatterStore } from "@/stores/chatterStore";
import { useHeroStore } from "@/stores/heroStore";
import type { Chatter } from "@/types/chatter";

const chatterStore = useChatterStore();
const heroStore = useHeroStore();
const { fetchChatters, ensureHero, deleteChatter } = useChatters();
const { fetchHeroes } = useHeroes();
useWebSocket();
const router = useRouter();

const search = ref("");
const page = ref(1);
const limit = ref(25);
const loading = ref(false);
const error = ref("");
const confirmDelete = ref<Chatter | null>(null);
const saving = ref(false);

const headers = [
  { title: "Пользователь", key: "displayName" },
  { title: "Счёт", key: "score" },
  { title: "Статус", key: "status" },
  { title: "Герой", key: "hero" },
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
    error.value =
      err instanceof Error ? err.message : "Не удалось загрузить пользователей";
  } finally {
    loading.value = false;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function scoreOf(item: Chatter) {
  return `${item.wins ?? 0}:${item.losses ?? 0}`;
}

function statusOf(item: Chatter) {
  if (item.status === "duel" || item.inDuel) return "в дуэли";
  if (item.status === "lying") return "лежит";
  return "гуляет";
}

function onRowClick(_event: unknown, row: { item: Chatter }) {
  void openHero(row.item);
}

async function openHero(chatter: Chatter) {
  try {
    let heroId = chatter.heroId;
    if (!heroId) {
      const result = await ensureHero(chatter.id);
      heroId = result.hero?.id ?? result.chatter.heroId;
    }
    if (heroId) {
      await router.push({ path: "/admin", query: { heroId: String(heroId) } });
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Не удалось открыть героя";
  }
}

async function removeUser(chatter: Chatter) {
  saving.value = true;
  try {
    await deleteChatter(chatter.id);
    confirmDelete.value = null;
    await load();
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Не удалось удалить пользователя";
  } finally {
    saving.value = false;
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
    <h1 class="text-h4 mb-2">Пользователи</h1>
    <p class="text-medium-emphasis mb-4">
      Счёт — победы:поражения. Клик по строке открывает героя. Дуэли только
      через <code>\duel ник</code>.
    </p>
    <v-text-field
      v-model="search"
      label="Поиск по нику"
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
      @click:row="onRowClick"
    >
      <template #item.displayName="{ item }">
        {{ item.displayName || item.username }} [{{ scoreOf(item) }}]
      </template>
      <template #item.score="{ item }">
        {{ scoreOf(item) }}
      </template>
      <template #item.status="{ item }">
        {{ statusOf(item) }}
      </template>
      <template #item.hero="{ item }">
        {{ item.hero?.name || "—" }}
      </template>
      <template #item.lastSeen="{ item }">
        {{ formatDate(item.lastSeen) }}
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click.stop="openHero(item)"
          >Герой</v-btn
        >
        <v-btn
          size="small"
          variant="text"
          color="error"
          @click.stop="confirmDelete = item"
        >
          Удалить
        </v-btn>
      </template>
      <template #no-data>
        Пока нет пользователей. Они появятся после чата или команды \duel.
      </template>
    </v-data-table-server>

    <v-dialog
      :model-value="Boolean(confirmDelete)"
      max-width="420"
      @update:model-value="
        (open) => {
          if (!open) confirmDelete = null;
        }
      "
    >
      <v-card v-if="confirmDelete">
        <v-card-title>Удалить пользователя?</v-card-title>
        <v-card-text>
          {{ confirmDelete.displayName || confirmDelete.username }} будет удалён
          вместе с историей сообщений и дуэлей.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDelete = null">Отмена</v-btn>
          <v-btn
            color="error"
            :loading="saving"
            @click="removeUser(confirmDelete)"
            >Удалить</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
