import { useAppStore } from "@/stores/appStore";
import type { Chatter } from "@/types/chatter";
import type { Hero, HeroConfig } from "@/types/hero";

function assertOk(data: { success: boolean; error?: string }, fallback: string) {
  if (!data.success) {
    throw new Error(data.error || fallback);
  }
}

export type MyHeroAuth = {
  twitchId: string;
  username?: string;
  displayName?: string;
};

export function useMyHero() {
  const appStore = useAppStore();

  function headers(auth: MyHeroAuth, json = false): HeadersInit {
    const result: Record<string, string> = {
      Authorization: "Bearer dev",
      "X-Dev-User-Id": auth.twitchId,
    };
    if (auth.username) result["X-Dev-User-Login"] = auth.username;
    if (auth.displayName) result["X-Dev-Display-Name"] = auth.displayName;
    if (json) result["Content-Type"] = "application/json";
    return result;
  }

  async function fetchMyHero(auth: MyHeroAuth) {
    const response = await fetch(`${appStore.apiUrl}/api/me/hero`, {
      headers: headers(auth),
    });
    const data = await response.json();
    if (response.status === 404 || data.error === "hero_not_found") {
      return { hero: null, chatter: null };
    }
    assertOk(data, "Failed to load hero");
    return {
      hero: data.hero as Hero,
      chatter: data.chatter as Chatter,
    };
  }

  async function createMyHero(auth: MyHeroAuth) {
    const response = await fetch(`${appStore.apiUrl}/api/me/hero`, {
      method: "POST",
      headers: headers(auth, true),
      body: "{}",
    });
    const data = await response.json();
    assertOk(data, "Failed to create hero");
    return {
      hero: data.hero as Hero,
      chatter: data.chatter as Chatter,
    };
  }

  async function saveMyHero(
    auth: MyHeroAuth,
    payload: { name: string; config: HeroConfig } & Record<string, unknown>,
  ) {
    const response = await fetch(`${appStore.apiUrl}/api/me/hero`, {
      method: "PATCH",
      headers: headers(auth, true),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    assertOk(data, "Failed to save hero");
    return data.hero as Hero;
  }

  return { fetchMyHero, createMyHero, saveMyHero };
}
