<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Hero } from "@/types/hero";
import { assetUrl } from "@/utils/assetUrl";

const props = defineProps<{
  hero?: Hero | null;
  saving?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  save: [form: FormData];
  cancel: [];
}>();

const name = ref(props.hero?.name || "");
const width = ref(props.hero?.width ?? 200);
const height = ref(props.hero?.height ?? 200);
const activeWidth = ref(props.hero?.activeWidth ?? 300);
const activeHeight = ref(props.hero?.activeHeight ?? 300);
const bubbleColor = ref(props.hero?.bubbleColor || "#ffffff");
const fontColor = ref(props.hero?.fontColor || "#000000");
const fontSize = ref(props.hero?.fontSize ?? 18);
const bubbleDuration = ref(props.hero?.bubbleDuration ?? 5000);
const gifFile = ref<File[] | File | null>(null);
const localPreview = ref("");

watch(
  () => props.hero,
  (hero) => {
    name.value = hero?.name || "";
    width.value = hero?.width ?? 200;
    height.value = hero?.height ?? 200;
    activeWidth.value = hero?.activeWidth ?? 300;
    activeHeight.value = hero?.activeHeight ?? 300;
    bubbleColor.value = hero?.bubbleColor || "#ffffff";
    fontColor.value = hero?.fontColor || "#000000";
    fontSize.value = hero?.fontSize ?? 18;
    bubbleDuration.value = hero?.bubbleDuration ?? 5000;
    gifFile.value = null;
    localPreview.value = "";
  },
);

const previewUrl = computed(() => {
  if (localPreview.value) return localPreview.value;
  if (props.hero?.gifUrl) return assetUrl(props.hero.gifUrl);
  return "";
});

function onFileChange(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value;
  if (localPreview.value) URL.revokeObjectURL(localPreview.value);
  localPreview.value = file ? URL.createObjectURL(file) : "";
}

watch(gifFile, onFileChange);

function submit() {
  const form = new FormData();
  form.append("name", name.value.trim());
  form.append("width", String(width.value));
  form.append("height", String(height.value));
  form.append("activeWidth", String(activeWidth.value));
  form.append("activeHeight", String(activeHeight.value));
  form.append("bubbleColor", bubbleColor.value);
  form.append("fontColor", fontColor.value);
  form.append("fontSize", String(fontSize.value));
  form.append("bubbleDuration", String(bubbleDuration.value));
  const file = Array.isArray(gifFile.value) ? gifFile.value[0] : gifFile.value;
  if (file) form.append("gif", file);
  emit("save", form);
}
</script>

<template>
  <v-form @submit.prevent="submit">
    <v-text-field v-model="name" label="Имя героя" variant="outlined" required class="mb-3" />
    <v-file-input
      v-model="gifFile"
      label="GIF"
      accept="image/gif"
      variant="outlined"
      prepend-icon=""
      prepend-inner-icon="mdi-gif"
      :hint="hero ? 'Оставьте пустым, чтобы не менять гифку' : 'Обязательно при создании'"
      persistent-hint
      class="mb-3"
    />
    <div v-if="previewUrl" class="mb-4">
      <img :src="previewUrl" alt="Превью" class="preview-gif" />
    </div>
    <v-row>
      <v-col cols="6">
        <v-text-field v-model.number="width" type="number" label="Ширина" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field v-model.number="height" type="number" label="Высота" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field v-model.number="activeWidth" type="number" label="Активная ширина" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field v-model.number="activeHeight" type="number" label="Активная высота" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field v-model="bubbleColor" type="color" label="Цвет облака" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field v-model="fontColor" type="color" label="Цвет текста" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field v-model.number="fontSize" type="number" label="Размер шрифта" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field
          v-model.number="bubbleDuration"
          type="number"
          label="Длительность облака (мс)"
          variant="outlined"
        />
      </v-col>
    </v-row>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <div class="d-flex ga-2">
      <v-btn color="primary" type="submit" :loading="saving">Сохранить</v-btn>
      <v-btn variant="text" type="button" @click="emit('cancel')">Отмена</v-btn>
    </div>
  </v-form>
</template>

<style scoped>
.preview-gif {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
}
</style>
