import {
  assignHeroToChatter,
  getChatterByUsername,
  getChatterWithHero,
  upsertChatterFromTwitch,
} from "../models/Chatter.js";
import { createHero, getHeroByUserId } from "../models/Hero.js";
import { randomHeroConfig } from "./heroAppearance.js";
import type { ChatterRow, ChatterWithHeroRow, HeroRow } from "../types.js";

export function ensurePersonalHero(chatter: ChatterRow): {
  chatter: ChatterWithHeroRow;
  hero: HeroRow;
  created: boolean;
} {
  const existing = getHeroByUserId(chatter.id);
  if (existing) {
    if (chatter.hero_id !== existing.id) {
      const updated = assignHeroToChatter(chatter.id, existing.id);
      return { chatter: updated, hero: existing, created: false };
    }
    const withHero = getChatterWithHero(chatter.id);
    if (!withHero) {
      throw new Error("Failed to load chatter with personal hero");
    }
    return { chatter: withHero, hero: existing, created: false };
  }

  const display = chatter.display_name || chatter.username;
  const config = randomHeroConfig(display);
  const hero = createHero({
    name: config.name,
    gifUrl: "",
    width: 160,
    height: 220,
    activeWidth: 180,
    activeHeight: 240,
    bubbleColor: "#ffffff",
    fontSize: 16,
    fontColor: "#111111",
    bubbleDuration: 5000,
    userId: chatter.id,
    config,
  });
  const updated = assignHeroToChatter(chatter.id, hero.id);
  return { chatter: updated, hero, created: true };
}

export function ensureUserAndHero(
  username: string,
  displayName?: string | null,
): { chatter: ChatterWithHeroRow; hero: HeroRow; created: boolean } {
  const nick = String(username || "").trim();
  const normalized = nick.toLowerCase();
  if (!normalized) {
    throw new Error("username is required");
  }
  let chatter = getChatterByUsername(normalized);
  if (!chatter) {
    chatter = upsertChatterFromTwitch({
      twitchId: `local:${normalized}`,
      username: normalized,
      displayName: displayName || nick,
    });
  }
  return ensurePersonalHero(chatter);
}
