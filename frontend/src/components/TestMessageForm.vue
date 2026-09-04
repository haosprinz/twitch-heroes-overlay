<script setup lang="ts">
import { computed } from "vue";
import type { Hero } from "@/types/hero";
import type { TestChatter } from "@/types/overlay";

const props = defineProps<{
  heroes: Hero[];
  sendingId?: number | null;
}>();

const chatters = defineModel<TestChatter[]>("chatters", { default: () => [] });
const showIdle = defineModel<boolean>("showIdle", { default: false });

const emit = defineEmits<{
  send: [chatterId: number];
  spam: [chatterId: number];
  longText: [chatterId: number];
  reset: [];
}>();

const heroItems = computed(() =>
  props.heroes.map((hero) => ({ title: hero.name, value: hero.id })),
);

function canSend(chatter: TestChatter) {
  return Boolean(chatter.heroId);
}
</script>

<template>
  <div>
    <v-card
      v-for="(chatter, index) in chatters"
      :key="chatter.id"
      variant="outlined"
      class="mb-4"
    >
      <v-card-title>Пользователь {{ index + 1 }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="chatter.username"
          label="Никнейм"
          hide-details
          class="mb-3"
        />
        <v-select
          v-model="chatter.heroId"
          :items="heroItems"
          label="Герой"
          hide-details
          class="mb-3"
        />
        <v-textarea
          v-model="chatter.text"
          label="Текст сообщения"
          rows="3"
          auto-grow
          hide-details="auto"
          class="mb-3"
        />
        <div class="text-caption mb-1">Длительность показа: {{ chatter.duration }} мс</div>
        <v-slider
          v-model="chatter.duration"
          :min="1000"
          :max="15000"
          :step="100"
          thumb-label
          hide-details
          class="mb-4"
        />
        <p v-if="!heroes.length" class="text-caption text-error mb-2">
          Нет героев — добавьте гифку в админке.
        </p>
        <div class="d-flex flex-wrap ga-2">
          <v-btn
            color="primary"
            :loading="sendingId === chatter.id"
            :disabled="!canSend(chatter) || Boolean(sendingId)"
            @click="emit('send', chatter.id)"
          >
            Отправить
          </v-btn>
          <v-btn
            variant="tonal"
            :disabled="Boolean(sendingId) || !canSend(chatter)"
            @click="emit('spam', chatter.id)"
          >
            Быстрый спам
          </v-btn>
          <v-btn variant="text" @click="emit('longText', chatter.id)">
            Тест длинного сообщения
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card variant="outlined">
      <v-card-text>
        <v-switch v-model="showIdle" label="Показать в спокойном состоянии" hide-details color="primary" class="mb-2" />
        <v-btn color="error" variant="tonal" @click="emit('reset')">Сбросить всех героев</v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>
