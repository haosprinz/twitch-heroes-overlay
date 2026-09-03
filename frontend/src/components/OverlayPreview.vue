<script setup lang="ts">
import OverlayStage from "@/components/OverlayStage.vue";

const background = defineModel<"checker" | "dark">("background", { default: "checker" });

defineProps<{
  idle?: boolean;
}>();
</script>

<template>
  <v-card variant="outlined" class="preview">
    <v-card-title class="d-flex align-center">
      Предпросмотр оверлея
      <v-spacer />
      <v-btn-toggle v-model="background" density="compact" mandatory variant="outlined">
        <v-btn value="checker" size="small">Шахматка</v-btn>
        <v-btn value="dark" size="small">Тёмный стрим</v-btn>
      </v-btn-toggle>
    </v-card-title>
    <v-card-text class="preview__stage-wrap">
      <div class="preview__stage" :class="`preview__stage--${background}`">
        <OverlayStage embedded :idle="idle" />
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.preview {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview__stage-wrap {
  flex: 1;
  min-height: 420px;
}

.preview__stage {
  position: relative;
  height: min(62vh, 720px);
  min-height: 420px;
  overflow: hidden;
  border-radius: 8px;
}

.preview__stage--checker {
  background-color: #cfcfcf;
  background-image:
    linear-gradient(45deg, #bdbdbd 25%, transparent 25%),
    linear-gradient(-45deg, #bdbdbd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #bdbdbd 75%),
    linear-gradient(-45deg, transparent 75%, #bdbdbd 75%);
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
}

.preview__stage--dark {
  background: #18181b;
}
</style>
