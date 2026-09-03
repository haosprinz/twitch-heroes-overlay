import { defineStore } from "pinia";
import { ref } from "vue";
import type { Hero } from "@/types/hero";

export const useHeroStore = defineStore("hero", () => {
  const heroes = ref<Hero[]>([]);
  const loading = ref(false);

  function setHeroes(next: Hero[]) {
    heroes.value = next;
  }

  function upsertHero(hero: Hero) {
    const index = heroes.value.findIndex((item) => item.id === hero.id);
    if (index === -1) {
      heroes.value.push(hero);
      return;
    }
    heroes.value[index] = hero;
  }

  function removeHero(heroId: number) {
    heroes.value = heroes.value.filter((item) => item.id !== heroId);
  }

  return { heroes, loading, setHeroes, upsertHero, removeHero };
});
