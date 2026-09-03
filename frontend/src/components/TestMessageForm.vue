<script setup lang="ts">
import { computed } from "vue";
import type { Chatter } from "@/types/chatter";
import type { Hero } from "@/types/hero";

const props = defineProps<{
  heroes: Hero[];
  chatters: Chatter[];
  sending?: boolean;
  disabled?: boolean;
}>();

const text = defineModel<string>("text", { default: "" });
const heroId = defineModel<number | null>("heroId", { default: null });
const chatterId = defineModel<number | null>("chatterId", { default: null });
const chatterName = defineModel<string>("chatterName", { default: "tester" });
const duration = defineModel<number>("duration", { default: 5000 });
const showIdle = defineModel<boolean>("showIdle", { default: false });

const emit = defineEmits<{
  send: [];
  spam: [];
  longText: [];
  activate: [];
  reset: [];
}>();

const heroItems = computed(() => [
  { title: "Случайный", value: null as number | null },
  ...props.heroes.map((hero) => ({ title: hero.name, value: hero.id })),
]);

const chatterItems = computed(() =>
  props.chatters.map((chatter) => ({
    title: chatter.displayName || chatter.username,
    value: chatter.id,
  })),
);
</script>

<template>
  <v-card variant="outlined">
    <v-card-title>Тестовое сообщение</v-card-title>
    <v-card-text>
      <v-textarea
        v-model="text"
        label="Текст сообщения"
        rows="3"
        auto-grow
        hide-details="auto"
        class="mb-3"
      />
      <v-select
        v-model="heroId"
        :items="heroItems"
        label="Герой"
        hide-details
        class="mb-3"
      />
      <v-autocomplete
        v-model="chatterId"
        :items="chatterItems"
        label="Чаттер"
        clearable
        hide-details
        class="mb-3"
      />
      <v-text-field
        v-if="!chatterId"
        v-model="chatterName"
        label="Никнейм"
        hide-details
        class="mb-3"
      />
      <div class="text-caption mb-1">Длительность показа: {{ duration }} мс</div>
      <v-slider
        v-model="duration"
        :min="1000"
        :max="15000"
        :step="100"
        thumb-label
        hide-details
        class="mb-4"
      />
      <div class="d-flex flex-wrap ga-2 mb-4">
        <v-btn color="primary" :loading="sending" :disabled="disabled" @click="emit('send')">
          Отправить
        </v-btn>
        <v-btn variant="tonal" :disabled="sending || disabled" @click="emit('spam')">
          Быстрый спам
        </v-btn>
        <v-btn variant="text" @click="emit('longText')">Тест длинного сообщения</v-btn>
      </div>
      <v-switch v-model="showIdle" label="Показать в спокойном состоянии" hide-details color="primary" class="mb-2" />
      <div class="d-flex flex-wrap ga-2">
        <v-btn variant="outlined" @click="emit('activate')">Показать активацию</v-btn>
        <v-btn color="error" variant="tonal" @click="emit('reset')">Сбросить всех героев</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>
