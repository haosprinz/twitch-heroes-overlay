import { emitToClients } from "../services/chatService.js";
import { getChatterById } from "../models/Chatter.js";
import { getHeroById, pickRandomHero } from "../models/Hero.js";

export type TestMessagePayload = {
  text?: string;
  heroId?: number | null;
  chatterId?: number | null;
  chatterName?: string;
  duration?: number;
};

function clampDuration(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(15_000, Math.max(1_000, Math.trunc(parsed)));
}

export function handleTestMessage(payload: TestMessagePayload = {}): void {
  const text = String(payload.text ?? "");
  let hero = payload.heroId ? getHeroById(Number(payload.heroId)) : undefined;

  let chatterId: number | null = null;
  let chatterTwitchId: string | null = null;
  let username = String(payload.chatterName || "").trim() || "tester";

  if (payload.chatterId) {
    const chatter = getChatterById(Number(payload.chatterId));
    if (chatter) {
      chatterId = chatter.id;
      chatterTwitchId = chatter.twitch_id;
      username = chatter.display_name || chatter.username;
      if (!hero && chatter.hero_id) {
        hero = getHeroById(chatter.hero_id);
      }
    }
  }

  if (!hero) {
    hero = pickRandomHero() ?? undefined;
  }
  if (!hero) {
    emitToClients("system_message", {
      message: "Нет героев для теста. Добавьте героя в админке.",
      type: "error",
      timestamp: Date.now(),
    });
    return;
  }

  emitToClients("new_message", {
    chatterId,
    chatterTwitchId,
    username,
    heroId: hero.id,
    message: text,
    timestamp: Date.now(),
    source: "test",
    duration: clampDuration(payload.duration),
  });
}

export function handleTestResetOverlay(): void {
  emitToClients("overlay_reset", {
    timestamp: Date.now(),
  });
}
