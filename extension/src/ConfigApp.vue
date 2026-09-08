<script setup lang="ts">
import { onMounted, ref } from "vue";

const theme = ref("dark");

onMounted(() => {
  window.Twitch?.ext.onContext((context) => {
    theme.value = context.theme || "dark";
    document.documentElement.dataset.theme = theme.value;
  });
});
</script>

<template>
  <main class="config">
    <h1>Twitch Heroes</h1>
    <p>
      Панель даёт зрителю своего героя. После входа через Twitch он меняет
      внешность; изменения сразу видны в OBS overlay.
    </p>
    <ol>
      <li>В Capabilities расширения включите Request Identity Link.</li>
      <li>
        В <code>backend/.env</code> укажите <code>TWITCH_EXTENSION_SECRET</code>
        (base64, из Extension Client Configuration).
      </li>
      <li>
        Asset Hosting для разработки: <code>http://localhost:5174</code>.
        Panel Viewer Path — <code>index.html</code>, Config Path —
        <code>config.html</code>, высота панели 500.
      </li>
      <li>
        Владелец канала по-прежнему правит любого героя на
        <code>http://localhost:5173/admin</code>.
      </li>
    </ol>
  </main>
</template>

<style scoped>
.config {
  padding: 16px;
  max-width: 520px;
}

h1 {
  margin: 0 0 8px;
  font-size: 20px;
}

p,
li {
  font-size: 14px;
  line-height: 1.45;
}

ol {
  padding-left: 18px;
}

code {
  font-size: 12px;
}
</style>
