<script setup lang="ts">
import type { TestChatter } from "@/types/overlay";

defineProps<{
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
        <div class="d-flex flex-wrap ga-2">
          <v-btn
            color="primary"
            :loading="sendingId === chatter.id"
            :disabled="Boolean(sendingId)"
            @click="emit('send', chatter.id)"
          >
            Отправить
          </v-btn>
          <v-btn
            variant="tonal"
            :disabled="Boolean(sendingId)"
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
