import { serializeHero } from "../models/Hero.js";
import { emitToClients } from "./realtime.js";
import { getOverlayState } from "./overlayState.js";
import type { HeroRow } from "../types.js";

export function emitHeroMutation(
  event: "hero_created" | "hero_updated" | "hero_deleted",
  payload: { hero?: ReturnType<typeof serializeHero>; heroId?: number },
): void {
  emitToClients(event, { ...payload, timestamp: Date.now() });
  emitToClients("overlay_state", { ...getOverlayState(), timestamp: Date.now() });
}

export function emitHeroSaved(hero: HeroRow, created = false): ReturnType<typeof serializeHero> {
  const mapped = serializeHero(hero);
  emitHeroMutation(created ? "hero_created" : "hero_updated", { hero: mapped });
  return mapped;
}
