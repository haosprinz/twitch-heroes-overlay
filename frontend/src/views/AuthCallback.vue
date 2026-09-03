<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(() => {
  router.replace("/");
});
</script>

<template>
  <v-container>
    <v-alert type="info">Код OAuth обрабатывает backend. Перенаправляем на главную…</v-alert>
  </v-container>
</template>
