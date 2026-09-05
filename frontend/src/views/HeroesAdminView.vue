<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import HeroCard from "@/components/HeroCard.vue";
import HeroForm from "@/components/HeroForm.vue";
import { useHeroes } from "@/composables/useHeroes";
import { useHeroStore } from "@/stores/heroStore";
import { useWebSocket } from "@/composables/useWebSocket";
import type { Hero, HeroConfig } from "@/types/hero";

const heroStore = useHeroStore();
const { fetchHeroes, updateHero, deleteHero } = useHeroes();
useWebSocket();
const route = useRoute();
const router = useRouter();

const dialog = ref(false);
const editing = ref<Hero | null>(null);
const saving = ref(false);
const error = ref("");
const confirmDelete = ref<Hero | null>(null);

function statusLabel(hero: Hero) {
  if (hero.status === "duel") return "в дуэли";
  if (hero.status === "lying") return "лежит";
  return "патрулирование";
}

onMounted(async () => {
  try {
    heroStore.setHeroes(await fetchHeroes());
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось загрузить героев";
  }
  openFromQuery();
});

function openFromQuery() {
  const heroId = Number(route.query.heroId);
  if (!heroId) return;
  const hero = heroStore.heroes.find((item) => item.id === heroId);
  if (hero) openEdit(hero);
}

watch(
  () => route.query.heroId,
  () => openFromQuery(),
);

function openEdit(hero: Hero) {
  editing.value = hero;
  error.value = "";
  dialog.value = true;
}

async function save(payload: { name: string; config: HeroConfig } & Record<string, unknown>) {
  if (!editing.value) return;
  saving.value = true;
  error.value = "";
  try {
    const hero = await updateHero(editing.value.id, payload);
    heroStore.upsertHero(hero);
    dialog.value = false;
    if (route.query.heroId) {
      await router.replace({ path: "/admin" });
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось сохранить героя";
  } finally {
    saving.value = false;
  }
}

async function confirmRemove() {
  if (!confirmDelete.value) return;
  try {
    await deleteHero(confirmDelete.value.id);
    heroStore.removeHero(confirmDelete.value.id);
    confirmDelete.value = null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось удалить героя";
  }
}
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4">Герои</h1>
        <p class="text-medium-emphasis mt-1">
          Рисованные человечки. Дуэли запускаются только командой <code>\duel ник</code> в чате.
        </p>
      </div>
    </div>
    <v-alert v-if="error && !dialog" type="error" class="mb-4">{{ error }}</v-alert>
    <v-row>
      <v-col v-for="hero in heroStore.heroes" :key="hero.id" cols="12" sm="6" md="4">
        <v-card>
          <v-card-title class="d-flex align-center">
            {{ hero.username || hero.name }}
            <v-spacer />
            <v-chip size="small" variant="tonal">{{ statusLabel(hero) }}</v-chip>
          </v-card-title>
          <v-card-text>
            <HeroCard :hero="hero" :status="hero.status" />
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" @click="openEdit(hero)">Изменить</v-btn>
            <v-btn color="error" variant="text" @click="confirmDelete = hero">Удалить</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col v-if="!heroStore.heroes.length" cols="12">
        <v-alert type="info">
          Героев пока нет. Они появятся после первого сообщения в чате или команды \duel.
        </v-alert>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="780">
      <v-card>
        <v-card-title>{{ editing ? `Редактировать ${editing.username || editing.name}` : "Герой" }}</v-card-title>
        <v-card-text>
          <HeroForm
            :hero="editing"
            :saving="saving"
            :error="error"
            @save="save"
            @cancel="dialog = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(confirmDelete)" max-width="420" @update:model-value="(open) => { if (!open) confirmDelete = null }">
      <v-card v-if="confirmDelete">
        <v-card-title>Удалить героя?</v-card-title>
        <v-card-text>
          {{ confirmDelete.name }} будет удалён. У пользователя герой снимется; при следующей дуэли создастся новый.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDelete = null">Отмена</v-btn>
          <v-btn color="error" @click="confirmRemove">Удалить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
