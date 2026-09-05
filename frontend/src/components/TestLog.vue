<script setup lang="ts">
export type TestLogEntry = {
  id: number;
  timestamp: number;
  username: string;
  message: string;
  heroName: string;
  duration: number;
};

defineProps<{
  entries: TestLogEntry[];
}>();

const emit = defineEmits<{
  clear: [];
}>();

function formatTime(value: number) {
  return new Date(value).toLocaleTimeString("ru-RU");
}
</script>

<template>
  <v-card variant="outlined">
    <v-card-title class="d-flex align-center">
      Лог теста
      <v-spacer />
      <v-btn size="small" variant="text" @click="emit('clear')">Очистить лог</v-btn>
    </v-card-title>
    <v-card-text class="log-body">
      <v-table v-if="entries.length" density="compact">
        <thead>
          <tr>
            <th>Время</th>
            <th>Пользователь</th>
            <th>Текст</th>
            <th>Герой</th>
            <th>Длительность</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.id">
            <td>{{ formatTime(entry.timestamp) }}</td>
            <td>{{ entry.username }}</td>
            <td class="log-text">{{ entry.message || "—" }}</td>
            <td>{{ entry.heroName }}</td>
            <td>{{ entry.duration }} мс</td>
          </tr>
        </tbody>
      </v-table>
      <div v-else class="text-medium-emphasis">Пока нет тестовых отправок.</div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.log-body {
  max-height: min(32vh, 320px);
  overflow: auto;
}

.log-text {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
