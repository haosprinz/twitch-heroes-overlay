<script setup lang="ts">
import { onMounted, ref } from "vue";
import HeroCard from "@/components/HeroCard.vue";
import HeroForm from "@/components/HeroForm.vue";
import { useHeroes } from "@/composables/useHeroes";
import { useHeroStore } from "@/stores/heroStore";
import { useWebSocket } from "@/composables/useWebSocket";
import type { Hero } from "@/types/hero";

const heroStore = useHeroStore();
const { fetchHeroes, createHero, updateHero, deleteHero } = useHeroes();
useWebSocket();

const dialog = ref(false);
const editing = ref<Hero | null>(null);
const saving = ref(false);
const error = ref("");
const confirmDelete = ref<Hero | null>(null);

onMounted(async () => {
  try {
    heroStore.setHeroes(await fetchHeroes());
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Не удалось загрузить героев";
  }
});

function openCreate() {
  editing.value = null;
  error.value = "";
  dialog.value = true;
}

function openEdit(hero: Hero) {
  editing.value = hero;
  error.value = "";
  dialog.value = true;
}

async function save(form: FormData) {
  saving.value = true;
  error.value = "";
  try {
    if (!editing.value && !form.get("gif")) {
      throw new Error("Выберите GIF-файл");
    }
    const hero = editing.value
      ? await updateHero(editing.value.id, form)
      : await createHero(form);
    heroStore.upsertHero(hero);
    dialog.value = false;
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
      <h1 class="text-h4">Герои</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Добавить героя</v-btn>
    </div>
    <v-alert v-if="error && !dialog" type="error" class="mb-4">{{ error }}</v-alert>
    <v-row>
      <v-col v-for="hero in heroStore.heroes" :key="hero.id" cols="12" sm="6" md="4">
        <v-card>
          <v-card-title>{{ hero.name }}</v-card-title>
          <v-card-text>
            <HeroCard :hero="hero" />
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" @click="openEdit(hero)">Изменить</v-btn>
            <v-btn color="error" variant="text" @click="confirmDelete = hero">Удалить</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col v-if="!heroStore.heroes.length" cols="12">
        <v-alert type="info">Героев пока нет. Добавьте первого — без них overlay и команды чата пустые.</v-alert>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="720">
      <v-card>
        <v-card-title>{{ editing ? `Редактировать ${editing.name}` : "Новый герой" }}</v-card-title>
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
          {{ confirmDelete.name }} будет удалён, гифка сотрётся, у пользователей герой снимется.
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
