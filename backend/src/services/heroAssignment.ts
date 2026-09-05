import {
  assignHeroToChatter,
  clearHeroFromChatter,
  getChatterById,
  getChatterWithHero,
} from "../models/Chatter.js";
import { getHeroById, getHeroByName, pickRandomHero } from "../models/Hero.js";
import { serializeChatterStatus } from "./overlayState.js";
import type {
  AssignResult,
  ChatterWithHeroRow,
  SerializedChatter,
} from "../types.js";

export function serializeChatter(
  row: ChatterWithHeroRow | null | undefined,
): SerializedChatter | null {
  if (!row) return null;
  return serializeChatterStatus(row);
}

export function assignHero(chatterId: number, heroId: number): AssignResult {
  const chatter = getChatterById(chatterId);
  if (!chatter) {
    return { ok: false, error: "Chatter not found" };
  }
  const hero = getHeroById(heroId);
  if (!hero) {
    return { ok: false, error: "Hero not found" };
  }
  const updated = assignHeroToChatter(chatterId, hero.id);
  return { ok: true, chatter: updated, hero };
}

export function assignHeroByName(chatterId: number, heroName: string): AssignResult {
  const hero = getHeroByName(heroName);
  if (!hero) {
    return { ok: false, error: "Hero not found", heroName };
  }
  return assignHero(chatterId, hero.id);
}

export function assignRandomHero(chatterId: number): AssignResult {
  const hero = pickRandomHero();
  if (!hero) {
    return { ok: false, error: "No heroes available" };
  }
  return assignHero(chatterId, hero.id);
}

export function unassignHero(chatterId: number): AssignResult {
  const chatter = getChatterById(chatterId);
  if (!chatter) {
    return { ok: false, error: "Chatter not found" };
  }
  const updated = clearHeroFromChatter(chatterId);
  return { ok: true, chatter: updated, hero: null };
}

export function getAssignedChatter(chatterId: number): ChatterWithHeroRow | undefined {
  return getChatterWithHero(chatterId);
}
