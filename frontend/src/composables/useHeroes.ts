import { useAppStore } from "@/stores/appStore";
import type { Hero, HeroConfig } from "@/types/hero";

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

  async function updateHero(
    id: number,
    payload: FormData | { name: string; config: HeroConfig } & Record<string, unknown>,
  ): Promise<Hero> {
    const isForm = payload instanceof FormData;
    const response = await fetch(`${appStore.apiUrl}/api/heroes/${id}`, {
      method: "PUT",
      headers: isForm ? undefined : { "Content-Type": "application/json" },
      body: isForm ? payload : JSON.stringify(payload),
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
