import { useAppStore } from "@/stores/appStore";
import type { Hero } from "@/types/hero";

function assertOk(data: { success: boolean; error?: string }, fallback: string) {
  if (!data.success) {
    throw new Error(data.error || fallback);
  }
}

export function useHeroes() {
  const appStore = useAppStore();

  async function fetchHeroes(): Promise<Hero[]> {
    const response = await fetch(`${appStore.apiUrl}/api/heroes`);
    const data = await response.json();
    assertOk(data, "Failed to fetch heroes");
    return data.heroes as Hero[];
  }

  async function createHero(form: FormData): Promise<Hero> {
    const response = await fetch(`${appStore.apiUrl}/api/heroes`, {
      method: "POST",
      body: form,
    });
    const data = await response.json();
    assertOk(data, "Failed to create hero");
    return data.hero as Hero;
  }

  async function updateHero(id: number, form: FormData): Promise<Hero> {
    const response = await fetch(`${appStore.apiUrl}/api/heroes/${id}`, {
      method: "PUT",
      body: form,
    });
    const data = await response.json();
    assertOk(data, "Failed to update hero");
    return data.hero as Hero;
  }

  async function deleteHero(id: number): Promise<void> {
    const response = await fetch(`${appStore.apiUrl}/api/heroes/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    assertOk(data, "Failed to delete hero");
  }

  return { fetchHeroes, createHero, updateHero, deleteHero };
}
