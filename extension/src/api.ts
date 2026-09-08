import type { Hero, HeroConfig } from "./types";

const EBS_URL = import.meta.env.VITE_EBS_URL || "http://localhost:3000";

export type ViewerAuth = {
  token: string;
  twitchId?: string;
  username?: string;
  displayName?: string;
};

function headers(auth: ViewerAuth, json = false): HeadersInit {
  const result: Record<string, string> = {
    Authorization: `Bearer ${auth.token}`,
  };
  if (auth.twitchId) result["X-Dev-User-Id"] = auth.twitchId;
  if (auth.username) result["X-Dev-User-Login"] = auth.username;
  if (auth.displayName) result["X-Dev-Display-Name"] = auth.displayName;
  if (json) result["Content-Type"] = "application/json";
  return result;
}

async function parse(response: Response) {
  const data = (await response.json()) as {
    success: boolean;
    error?: string;
    message?: string;
    hero?: Hero;
  };
  if (!response.ok || !data.success) {
    const error = new Error(data.message || data.error || "Request failed");
    (error as Error & { code?: string }).code = data.error;
    throw error;
  }
  return data;
}

export async function fetchMyHero(auth: ViewerAuth): Promise<Hero | null> {
  const response = await fetch(`${EBS_URL}/api/me/hero`, {
    headers: headers(auth),
  });
  const data = (await response.json()) as {
    success: boolean;
    error?: string;
    message?: string;
    hero?: Hero;
  };
  if (response.status === 404 || data.error === "hero_not_found") {
    return null;
  }
  if (!response.ok || !data.success) {
    const error = new Error(data.message || data.error || "Request failed");
    (error as Error & { code?: string }).code = data.error;
    throw error;
  }
  if (!data.hero) throw new Error("Hero missing");
  return data.hero;
}

export async function createMyHero(auth: ViewerAuth): Promise<Hero> {
  const response = await fetch(`${EBS_URL}/api/me/hero`, {
    method: "POST",
    headers: headers(auth, true),
    body: "{}",
  });
  const data = await parse(response);
  if (!data.hero) throw new Error("Hero missing");
  return data.hero;
}

export async function saveMyHero(auth: ViewerAuth, payload: { config: HeroConfig } & Record<string, unknown>) {
  const response = await fetch(`${EBS_URL}/api/me/hero`, {
    method: "PATCH",
    headers: headers(auth, true),
    body: JSON.stringify(payload),
  });
  const data = await parse(response);
  if (!data.hero) throw new Error("Hero missing");
  return data.hero;
}
