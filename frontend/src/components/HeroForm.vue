<script setup lang="ts">
import { computed, ref, watch } from "vue";
import DrawnHero from "@/components/DrawnHero.vue";
import { defaultHeroConfig, type Hero, type HeroConfig } from "@/types/hero";

const props = defineProps<{
  hero?: Hero | null;
  saving?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  save: [payload: { name: string; config: HeroConfig } & Record<string, unknown>];
  cancel: [];
}>();

const config = ref<HeroConfig>(defaultHeroConfig(props.hero?.name || "Герой"));
const bubbleColor = ref(props.hero?.bubbleColor || "#ffffff");
const fontColor = ref(props.hero?.fontColor || "#111111");
const fontSize = ref(props.hero?.fontSize ?? 16);
const bubbleDuration = ref(props.hero?.bubbleDuration ?? 5000);

watch(
  () => props.hero,
  (hero) => {
    config.value = {
      ...defaultHeroConfig(hero?.name || "Герой"),
      ...(hero?.config || {}),
      name: hero?.name || hero?.config?.name || "Герой",
    };
    bubbleColor.value = hero?.bubbleColor || "#ffffff";
    fontColor.value = hero?.fontColor || "#111111";
    fontSize.value = hero?.fontSize ?? 16;
    bubbleDuration.value = hero?.bubbleDuration ?? 5000;
  },
  { immediate: true },
);

const hairItems = [
  { title: "Короткие", value: "short" },
  { title: "Длинные", value: "long" },
  { title: "Ёжик", value: "spiky" },
  { title: "Лысый", value: "bald" },
  { title: "Хвост", value: "ponytail" },
];
const hatItems = [
  { title: "Без убора", value: "none" },
  { title: "Кепка", value: "cap" },
  { title: "Шапка", value: "beanie" },
  { title: "Корона", value: "crown" },
];
const glassesItems = [
  { title: "Без очков", value: "none" },
  { title: "Круглые", value: "round" },
  { title: "Квадратные", value: "square" },
];

const lockedName = computed(() => props.hero?.username || config.value.name);

const previewHero = computed(() => ({
  ...(props.hero || {
    id: 0,
    name: config.value.name,
    gifUrl: "",
    width: 160,
    height: 220,
    activeWidth: 180,
    activeHeight: 240,
    bubbleColor: bubbleColor.value,
    fontSize: fontSize.value,
    fontColor: fontColor.value,
    bubbleDuration: bubbleDuration.value,
  }),
  name: config.value.name,
  config: config.value,
}));

function submit() {
  const name = (lockedName.value || "Герой").trim();
  emit("save", {
    name,
    config: { ...config.value, name },
    bubbleColor: bubbleColor.value,
    fontColor: fontColor.value,
    fontSize: fontSize.value,
    bubbleDuration: bubbleDuration.value,
    width: 160,
    height: 220,
    activeWidth: 180,
    activeHeight: 240,
  });
}
</script>

<template>
  <v-form @submit.prevent="submit">
    <div class="d-flex justify-center mb-4">
      <DrawnHero :hero="previewHero" pose="idle" />
    </div>
    <v-text-field
      v-if="hero?.username"
      :model-value="lockedName"
      label="Имя героя"
      variant="outlined"
      class="mb-3"
      disabled
      hint="Совпадает с никнеймом пользователя"
      persistent-hint
    />
    <v-text-field
      v-else
      v-model="config.name"
      label="Имя героя"
      variant="outlined"
      required
      class="mb-3"
    />
    <v-row>
      <v-col cols="6">
        <v-text-field v-model="config.skin" type="color" label="Кожа" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field v-model="config.hairColor" type="color" label="Цвет волос" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-select v-model="config.hair" :items="hairItems" label="Волосы" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-select v-model="config.hat" :items="hatItems" label="Убор" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-select v-model="config.glasses" :items="glassesItems" label="Очки" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field v-model="config.shirtColor" type="color" label="Одежда" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-text-field v-model="config.pantsColor" type="color" label="Штаны" variant="outlined" />
      </v-col>
      <v-col cols="6">
        <v-slider v-model="config.size" :min="0.6" :max="1.8" :step="0.05" label="Размер" thumb-label />
      </v-col>
      <v-col cols="6">
        <v-slider v-model="config.speed" :min="0.4" :max="2.2" :step="0.05" label="Скорость" thumb-label />
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
