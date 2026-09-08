<script setup lang="ts">
import { ref, watch } from "vue";
import DrawnHero from "./DrawnHero.vue";
import { defaultHeroConfig, type Hero, type HeroConfig } from "./types";

const props = defineProps<{
  hero: Hero;
  saving?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  save: [payload: { name: string; config: HeroConfig } & Record<string, unknown>];
}>();

const config = ref<HeroConfig>(defaultHeroConfig(props.hero.name));

watch(
  () => props.hero,
  (hero) => {
    config.value = {
      ...defaultHeroConfig(hero.name),
      ...(hero.config || {}),
      name: hero.username || hero.name,
      size: 1,
    };
  },
  { immediate: true },
);

function submit() {
  emit("save", {
    name: config.value.name,
    config: { ...config.value, size: 1 },
    bubbleColor: props.hero.bubbleColor,
    fontColor: props.hero.fontColor,
    fontSize: props.hero.fontSize,
    bubbleDuration: props.hero.bubbleDuration,
  });
}
</script>

<template>
  <form class="editor" @submit.prevent="submit">
    <div class="editor__preview">
      <DrawnHero :hero="hero" :config="config" pose="idle" />
      <div class="editor__name">{{ config.name }}</div>
    </div>

    <label>Кожа <input v-model="config.skin" type="color" /></label>
    <label>Волосы
      <select v-model="config.hair">
        <option value="short">Короткие</option>
        <option value="long">Длинные</option>
        <option value="spiky">Ёжик</option>
        <option value="bald">Лысый</option>
        <option value="ponytail">Хвост</option>
      </select>
    </label>
    <label>Цвет волос <input v-model="config.hairColor" type="color" /></label>
    <label>Убор
      <select v-model="config.hat">
        <option value="none">Без убора</option>
        <option value="cap">Кепка</option>
        <option value="beanie">Шапка</option>
        <option value="crown">Корона</option>
      </select>
    </label>
    <label>Очки
      <select v-model="config.glasses">
        <option value="none">Без очков</option>
        <option value="round">Круглые</option>
        <option value="square">Квадратные</option>
      </select>
    </label>
    <label>Одежда <input v-model="config.shirtColor" type="color" /></label>
    <label>Штаны <input v-model="config.pantsColor" type="color" /></label>
    <label>Скорость
      <input v-model.number="config.speed" type="range" min="0.4" max="2.2" step="0.05" />
    </label>

    <p v-if="error" class="editor__error">{{ error }}</p>
    <button type="submit" :disabled="saving">{{ saving ? "Сохранение…" : "Сохранить" }}</button>
  </form>
</template>

<style scoped>
.editor {
  display: grid;
  gap: 8px;
}

.editor__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 4px;
}

.editor__name {
  font-weight: 700;
  font-size: 14px;
}

label {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

input,
select,
button {
  width: 100%;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, currentColor 6%, transparent);
  color: inherit;
  padding: 6px 8px;
}

input[type="color"] {
  padding: 2px;
  height: 32px;
}

input[type="range"] {
  padding: 0;
  border: 0;
  background: transparent;
}

button {
  margin-top: 6px;
  background: #9146ff;
  border-color: #9146ff;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

.editor__error {
  color: #e74c3c;
  margin: 0;
  font-size: 13px;
}
</style>
