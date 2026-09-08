import {
  assignHeroToChatter,
  getChatterById,
  getChatterByTwitchId,
  getChatterByUsername,
  getChatterWithHero,
  listChatters,
  upsertChatterFromTwitch,
} from "../models/Chatter.js";
import {
  createHero,
  deleteHero,
  getHeroById,
  getHeroByUserId,
  heroConfigOf,
  listUnownedHeroes,
  updateHero,
} from "../models/Hero.js";
import { parseHeroConfig, randomHeroConfig } from "./heroAppearance.js";
import type { ChatterRow, ChatterWithHeroRow, HeroPatch, HeroRow } from "../types.js";

const DEFAULT_HERO_SIZE = {
  width: 160,
  height: 220,
  activeWidth: 180,
  activeHeight: 240,
  bubbleColor: "#ffffff",
  fontSize: 16,
  fontColor: "#111111",
  bubbleDuration: 5000,
};

export function appearanceFromBody(body: Record<string, unknown> | undefined, fallbackName: string): HeroPatch {
  const source = body ?? {};
  return {
    config: source.config != null ? parseHeroConfig(source.config, fallbackName) : undefined,
    bubbleColor: typeof source.bubbleColor === "string" ? source.bubbleColor : undefined,
    fontColor: typeof source.fontColor === "string" ? source.fontColor : undefined,
    fontSize: Number.isFinite(Number(source.fontSize)) ? Number(source.fontSize) : undefined,
    bubbleDuration: Number.isFinite(Number(source.bubbleDuration))
      ? Number(source.bubbleDuration)
      : undefined,
    width: DEFAULT_HERO_SIZE.width,
    height: DEFAULT_HERO_SIZE.height,
    activeWidth: DEFAULT_HERO_SIZE.activeWidth,
    activeHeight: DEFAULT_HERO_SIZE.activeHeight,
  };
}

export function findPersonalHeroByTwitchId(twitchId: string): {
  chatter: ChatterWithHeroRow;
  hero: HeroRow;
} | null {
  const chatter = getChatterByTwitchId(String(twitchId || "").trim());
  if (!chatter) return null;
  const hero = getHeroByUserId(chatter.id) ?? (chatter.hero_id ? getHeroById(chatter.hero_id) : undefined);
  if (!hero) return null;
  const withHero = getChatterWithHero(chatter.id);
  if (!withHero) return null;
  return { chatter: withHero, hero };
}

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

  const assigned = chatter.hero_id ? getHeroById(chatter.hero_id) : undefined;
  const display = chatter.display_name || chatter.username;
  const config =
    assigned && assigned.user_id == null
      ? { ...heroConfigOf(assigned), name: display }
      : randomHeroConfig(display);
  const hero = createHero({
    name: config.name,
    gifUrl: "",
    ...DEFAULT_HERO_SIZE,
    bubbleColor: assigned?.bubble_color || DEFAULT_HERO_SIZE.bubbleColor,
    fontSize: assigned?.font_size || DEFAULT_HERO_SIZE.fontSize,
    fontColor: assigned?.font_color || DEFAULT_HERO_SIZE.fontColor,
    bubbleDuration: assigned?.bubble_duration || DEFAULT_HERO_SIZE.bubbleDuration,
    userId: chatter.id,
    config,
  });
  const updated = assignHeroToChatter(chatter.id, hero.id);
  return { chatter: updated, hero, created: true };
}

export function updatePersonalHero(
  chatter: ChatterRow,
  patch: HeroPatch,
): { chatter: ChatterWithHeroRow; hero: HeroRow; created: boolean } {
  const ensured = ensurePersonalHero(chatter);
  const hero = updateHero(ensured.hero.id, {
    ...patch,
    userId: chatter.id,
    name: chatter.display_name || chatter.username,
  });
  if (!hero) {
    throw new Error("Failed to update personal hero");
  }
  const withHero = getChatterWithHero(chatter.id);
  if (!withHero) {
    throw new Error("Failed to load chatter after hero update");
  }
  return { chatter: withHero, hero, created: ensured.created };
}

export function resetPersonalHero(chatter: ChatterRow): {
  chatter: ChatterWithHeroRow;
  hero: HeroRow;
  created: boolean;
} {
  const display = chatter.display_name || chatter.username;
  return updatePersonalHero(chatter, {
    config: randomHeroConfig(display),
    ...DEFAULT_HERO_SIZE,
  });
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

export function ensureChatterByTwitchId(input: {
  twitchId: string;
  username?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
}): ChatterRow {
  const twitchId = String(input.twitchId || "").trim();
  if (!twitchId) {
    throw new Error("twitchId is required");
  }
  const existing = getChatterByTwitchId(twitchId);
  const username = (input.username || existing?.username || `user_${twitchId}`).toLowerCase();
  return upsertChatterFromTwitch({
    twitchId,
    username,
    displayName: input.displayName || existing?.display_name || username,
    profileImageUrl: input.profileImageUrl || existing?.profile_image_url,
  });
}

export function migrateToPersonalHeroes(): { created: number; removedTemplates: number } {
  let created = 0;
  for (const row of listChatters()) {
    const chatter = getChatterById(row.id);
    if (!chatter) continue;
    const result = ensurePersonalHero(chatter);
    if (result.created) created += 1;
  }
  let removedTemplates = 0;
  for (const hero of listUnownedHeroes()) {
    deleteHero(hero.id);
    removedTemplates += 1;
  }
  if (created || removedTemplates) {
    console.log(
      `Personal heroes: created ${created}, removed ${removedTemplates} shared templates`,
    );
  }
  return { created, removedTemplates };
}
