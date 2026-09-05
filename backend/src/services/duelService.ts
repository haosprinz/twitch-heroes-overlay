import { randomInt } from "node:crypto";
import { getDb } from "../config/database.js";
import { insertDuel, listDuelsBetween, listRecentDuels } from "../models/Duel.js";
import { getHeroByUserId, heroConfigOf, serializeHero } from "../models/Hero.js";
import {
  applyDuelRecord,
  clearAllInDuel,
  clearExpiredKnockouts,
  getChatterById,
  getChatterWithHero,
  listKnockedOut,
  setChatterDuelFlags,
} from "../models/Chatter.js";
import { getSetting, setSetting } from "../models/Settings.js";
import type { ChatterRow, CommandResult } from "../types.js";
import { emitToClients } from "./realtime.js";
import { ensurePersonalHero, ensureUserAndHero } from "./heroFactory.js";
import { getActiveDuel, getOverlayState, serializeChatterStatus, setActiveDuel } from "./overlayState.js";

const APPROACH_MS = 2000;
const COUNTDOWN_GAP_MS = 1000;
const KNOCKOUT_MS = 60_000;
const COOLDOWN_MS = 60_000;
const COOLDOWN_MESSAGE = "Перезаряжаем пистолеты и ищем секунданта";

type ChatReply = (message: string, type?: string) => Promise<void> | void;

let sendReply: ChatReply = () => undefined;
const timers = new Set<ReturnType<typeof setTimeout>>();
const reviveTimers = new Map<number, ReturnType<typeof setTimeout>>();
let duelLock = false;

export function attachDuelChat(fn: ChatReply): void {
  sendReply = fn;
}

function later(ms: number, fn: () => void): void {
  const timer = setTimeout(() => {
    timers.delete(timer);
    fn();
  }, ms);
  timers.add(timer);
}

function displayName(row: { display_name?: string | null; username: string }): string {
  return row.display_name || row.username;
}

function isLying(row: ChatterRow): boolean {
  return Boolean(row.lying_until && new Date(row.lying_until).getTime() > Date.now());
}

function cooldownActive(): boolean {
  const raw = getSetting("duel_cooldown_until");
  if (!raw) return false;
  const until = new Date(raw).getTime();
  return Number.isFinite(until) && until > Date.now();
}

function emitOverlay(): void {
  emitToClients("overlay_state", {
    ...getOverlayState(),
    timestamp: Date.now(),
  });
}

function emitUser(chatterId: number): void {
  const chatter = getChatterWithHero(chatterId);
  if (!chatter) return;
  emitToClients("chatter_updated", {
    chatterId,
    chatter: serializeChatterStatus(chatter),
    timestamp: Date.now(),
  });
}

function actorPayload(chatter: ChatterRow) {
  const ensured = ensurePersonalHero(chatter);
  return {
    chatterId: ensured.chatter.id,
    username: ensured.chatter.username,
    displayName: displayName(ensured.chatter),
    wins: Number(ensured.chatter.wins || 0),
    losses: Number(ensured.chatter.losses || 0),
    status: "duel" as const,
    lyingUntil: ensured.chatter.lying_until,
    inDuel: true,
    hero: serializeHero(ensured.hero),
  };
}

function finishRevive(chatterId: number): void {
  setChatterDuelFlags(chatterId, { lyingUntil: null, inDuel: false });
  const duel = getActiveDuel();
  if (duel && (duel.loserId === chatterId || duel.phase === "result")) {
    setActiveDuel(null);
  }
  emitToClients("duel:revive", { userId: chatterId, timestamp: Date.now() });
  emitUser(chatterId);
  emitOverlay();
}

export function scheduleRevive(chatterId: number, lyingUntil: string | null): void {
  const existing = reviveTimers.get(chatterId);
  if (existing) clearTimeout(existing);
  if (!lyingUntil) return;
  const remain = new Date(lyingUntil).getTime() - Date.now();
  if (remain <= 0) {
    finishRevive(chatterId);
    return;
  }
  const timer = setTimeout(() => {
    reviveTimers.delete(chatterId);
    finishRevive(chatterId);
  }, remain);
  reviveTimers.set(chatterId, timer);
}

export function restoreDuelTimers(): void {
  clearAllInDuel();
  clearExpiredKnockouts();
  setActiveDuel(null);
  duelLock = false;
  for (const chatter of listKnockedOut()) {
    scheduleRevive(chatter.id, chatter.lying_until);
  }
}

function recentWinsFor(userId: number, recent: { winner_id: number | null }[]): number {
  let count = 0;
  for (const row of recent) {
    if (row.winner_id !== userId) break;
    count += 1;
  }
  return count;
}

function fighterWeight(chatter: ChatterRow, recentWins: number, pairWins: number): number {
  const wins = Number(chatter.wins || 0);
  const losses = Number(chatter.losses || 0);
  const look = heroConfigOf(getHeroByUserId(chatter.id));
  const underdog = 1 + Math.max(0, losses - wins) * 0.16;
  const experience = 1 + Math.min(wins + losses, 10) * 0.015;
  const streakPenalty = 1 / (1 + recentWins * 0.45);
  const pairPenalty = 1 / (1 + pairWins * 0.28);
  const body = 1 + (Number(look.size || 1) - 1) * 0.12 + (Number(look.speed || 1) - 1) * 0.08;
  const jitter = 0.88 + randomInt(0, 250) / 1000;
  return Math.max(0.12, underdog * experience * streakPenalty * pairPenalty * body * jitter);
}

function pickDuelWinner(challenger: ChatterRow, opponent: ChatterRow): number {
  const recent = listRecentDuels(12);
  const pair = listDuelsBetween(challenger.id, opponent.id, 8);
  const weights = [
    {
      id: challenger.id,
      weight: fighterWeight(
        challenger,
        recentWinsFor(challenger.id, recent),
        pair.filter((row) => row.winner_id === challenger.id).length,
      ),
    },
    {
      id: opponent.id,
      weight: fighterWeight(
        opponent,
        recentWinsFor(opponent.id, recent),
        pair.filter((row) => row.winner_id === opponent.id).length,
      ),
    },
  ];
  const total = weights[0].weight + weights[1].weight;
  const roll = randomInt(0, 1_000_000) / 1_000_000 * total;
  return roll < weights[0].weight ? weights[0].id : weights[1].id;
}

function runDuelTimeline(challengerId: number, opponentId: number): void {
  later(APPROACH_MS, () => {
    setActiveDuel({
      phase: "ready",
      challengerId,
      opponentId,
      winnerId: null,
      loserId: null,
      countdown: null,
    });
    emitToClients("duel:ready", { challengerId, opponentId, timestamp: Date.now() });

    later(500, () => {
      const values = [3, 2, 1];
      values.forEach((value, index) => {
        later(index * COUNTDOWN_GAP_MS, () => {
          setActiveDuel({
            phase: "countdown",
            challengerId,
            opponentId,
            winnerId: null,
            loserId: null,
            countdown: value,
          });
          emitToClients("duel:countdown", { value, challengerId, opponentId, timestamp: Date.now() });
          if (value === 1) {
            later(280, () => finishDuel(challengerId, opponentId));
          }
        });
      });
    });
  });
}

function finishDuel(challengerId: number, opponentId: number): void {
  const challenger = getChatterById(challengerId);
  const opponent = getChatterById(opponentId);
  if (!challenger || !opponent) {
    duelLock = false;
    setActiveDuel(null);
    clearAllInDuel();
    return;
  }
  const winnerId = pickDuelWinner(challenger, opponent);
  const loserId = winnerId === challengerId ? opponentId : challengerId;
  const winner = getChatterById(winnerId) ?? (winnerId === challengerId ? challenger : opponent);
  const loser = getChatterById(loserId) ?? (loserId === challengerId ? challenger : opponent);
  if (!winner || !loser) {
    duelLock = false;
    setActiveDuel(null);
    clearAllInDuel();
    return;
  }

  const lyingUntil = new Date(Date.now() + KNOCKOUT_MS).toISOString();
  const cooldownUntil = new Date(Date.now() + COOLDOWN_MS).toISOString();
  const persist = getDb().transaction(() => {
    insertDuel({ challengerId, opponentId, winnerId, loserId });
    applyDuelRecord(winnerId, loserId, lyingUntil);
    setSetting("duel_cooldown_until", cooldownUntil);
  });
  persist();

  setActiveDuel({
    phase: "result",
    challengerId,
    opponentId,
    winnerId,
    loserId,
    countdown: null,
  });

  emitToClients("duel:result", {
    winner: actorPayload(getChatterById(winnerId) ?? winner),
    loser: actorPayload(getChatterById(loserId) ?? loser),
    winnerId,
    loserId,
    lyingUntil,
    cooldownUntil,
    timestamp: Date.now(),
  });
  emitUser(winnerId);
  emitUser(loserId);
  emitOverlay();
  void sendReply(`🏆 ${displayName(winner)} победил! ${displayName(loser)} падает`, "success");

  scheduleRevive(loserId, lyingUntil);
  later(COOLDOWN_MS, () => {
    duelLock = false;
    if (getActiveDuel()) {
      setActiveDuel(null);
      emitOverlay();
    }
  });
}

export function requestDuel(challenger: ChatterRow, rawNick: string): CommandResult {
  const nick = String(rawNick || "").trim();
  if (!nick) {
    return { handled: true, type: "info", reply: "Использование: \\duel <ник>" };
  }

  if (cooldownActive() || duelLock) {
    return { handled: true, type: "info", reply: COOLDOWN_MESSAGE };
  }

  const knockedOut = listKnockedOut();
  if (knockedOut.length > 0) {
    return {
      handled: true,
      type: "error",
      reply: `${displayName(knockedOut[0])} ещё лежит`,
    };
  }

  const opponentName = nick.toLowerCase();
  if (opponentName === challenger.username.toLowerCase()) {
    return { handled: true, type: "error", reply: "Нельзя вызвать себя" };
  }

  const freshChallenger = getChatterById(challenger.id) ?? challenger;
  if (isLying(freshChallenger)) {
    return {
      handled: true,
      type: "error",
      reply: `${displayName(freshChallenger)} ещё лежит`,
    };
  }
  if (freshChallenger.in_duel) {
    return {
      handled: true,
      type: "error",
      reply: `${displayName(freshChallenger)} уже в дуэли`,
    };
  }

  const ensuredChallenger = ensurePersonalHero(freshChallenger);
  const ensuredOpponent = ensureUserAndHero(opponentName, nick);
  const opponent = ensuredOpponent.chatter;

  if (isLying(opponent)) {
    return { handled: true, type: "error", reply: `${displayName(opponent)} ещё лежит` };
  }
  if (opponent.in_duel) {
    return { handled: true, type: "error", reply: `${displayName(opponent)} уже в дуэли` };
  }

  duelLock = true;
  setChatterDuelFlags(ensuredChallenger.chatter.id, { inDuel: true });
  setChatterDuelFlags(opponent.id, { inDuel: true });
  setActiveDuel({
    phase: "start",
    challengerId: ensuredChallenger.chatter.id,
    opponentId: opponent.id,
    winnerId: null,
    loserId: null,
    countdown: null,
  });

  if (ensuredChallenger.created) {
    emitToClients("hero_created", {
      hero: serializeHero(ensuredChallenger.hero),
      timestamp: Date.now(),
    });
  }
  if (ensuredOpponent.created) {
    emitToClients("hero_created", {
      hero: serializeHero(ensuredOpponent.hero),
      timestamp: Date.now(),
    });
  }

  const challengerActor = actorPayload(ensuredChallenger.chatter);
  const opponentActor = actorPayload(opponent);
  emitToClients("duel:start", {
    challenger: challengerActor,
    opponent: opponentActor,
    timestamp: Date.now(),
  });
  emitUser(ensuredChallenger.chatter.id);
  emitUser(opponent.id);
  emitOverlay();
  runDuelTimeline(ensuredChallenger.chatter.id, opponent.id);

  return {
    handled: true,
    type: "success",
    reply: `⚔️ ${displayName(ensuredChallenger.chatter)} вызывает ${displayName(opponent)} на дуэль!`,
    chatter: ensuredChallenger.chatter,
    hero: ensuredChallenger.hero,
  };
}

export function statsReply(chatter: ChatterRow): CommandResult {
  const current = getChatterById(chatter.id) ?? chatter;
  const nick = displayName(current);
  const wins = Number(current.wins || 0);
  const losses = Number(current.losses || 0);
  if (wins === 0 && losses === 0) {
    return {
      handled: true,
      type: "info",
      reply: `${nick}: дуэлей пока нет [0:0]`,
    };
  }
  return {
    handled: true,
    type: "info",
    reply: `${nick}: победы ${wins}, поражения ${losses} [${wins}:${losses}]`,
  };
}

export function startTestDuel(_challengerName: string, _opponentName: string): CommandResult {
  return {
    handled: true,
    type: "info",
    reply: "Тестовая дуэль только на странице /test и не создаёт пользователей",
  };
}
