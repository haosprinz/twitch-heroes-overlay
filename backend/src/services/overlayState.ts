import { listChatters } from "../models/Chatter.js";
import { getHeroById, getHeroByUserId, serializeHero } from "../models/Hero.js";
import { getSetting } from "../models/Settings.js";
import type {
  ActiveDuelSnapshot,
  HeroStatus,
  OverlayActor,
  OverlayState,
  SerializedChatter,
} from "../types.js";

let activeDuel: ActiveDuelSnapshot | null = null;

export function setActiveDuel(next: ActiveDuelSnapshot | null): void {
  activeDuel = next;
}

export function getActiveDuel(): ActiveDuelSnapshot | null {
  return activeDuel;
}

export function heroStatusOf(row: {
  in_duel?: number | null;
  lying_until?: string | null;
}): HeroStatus {
  if (row.in_duel) return "duel";
  if (row.lying_until && new Date(row.lying_until).getTime() > Date.now()) {
    return "lying";
  }
  return "patrol";
}

export function serializeChatterStatus(
  row: Parameters<typeof heroStatusOf>[0] & {
    id: number;
    twitch_id: string;
    username: string;
    display_name: string | null;
    profile_image_url?: string | null;
    hero_id: number | null;
    last_seen: string;
    assigned_at?: string | null;
    message_count?: number;
    wins?: number;
    losses?: number;
    lying_until?: string | null;
    hero_name?: string | null;
  },
): SerializedChatter {
  return {
    id: row.id,
    twitchId: row.twitch_id,
    username: row.username,
    displayName: row.display_name,
    profileImageUrl: row.profile_image_url ?? null,
    heroId: row.hero_id,
    hero: row.hero_id ? { id: row.hero_id, name: row.hero_name ?? "" } : null,
    lastSeen: row.last_seen,
    assignedAt: row.assigned_at ?? null,
    messageCount: Number(row.message_count || 0),
    totalMessages: Number(row.message_count || 0),
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    lyingUntil: row.lying_until ?? null,
    inDuel: Boolean(row.in_duel),
    status: heroStatusOf(row),
  };
}

export function listOverlayActors(): OverlayActor[] {
  const actors: OverlayActor[] = [];
  for (const chatter of listChatters()) {
    const hero = getHeroByUserId(chatter.id) ?? (chatter.hero_id ? getHeroById(chatter.hero_id) : undefined);
    const serialized = serializeHero(hero);
    if (!serialized) continue;
    actors.push({
      chatterId: chatter.id,
      username: chatter.username,
      displayName: chatter.display_name || chatter.username,
      wins: Number(chatter.wins || 0),
      losses: Number(chatter.losses || 0),
      status: heroStatusOf(chatter),
      lyingUntil: chatter.lying_until,
      inDuel: Boolean(chatter.in_duel),
      hero: serialized,
    });
  }
  return actors;
}

export function getOverlayState(): OverlayState {
  return {
    actors: listOverlayActors(),
    duel: activeDuel,
    cooldownUntil: getSetting("duel_cooldown_until"),
  };
}
