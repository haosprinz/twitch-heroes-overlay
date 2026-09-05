import { defineStore } from "pinia";
import { ref } from "vue";
import type { ActiveDuel, OverlayActor } from "@/types/duel";
import type { HeroStatus } from "@/types/hero";

const idleDuel = (): ActiveDuel => ({
  phase: "idle",
  challengerId: null,
  opponentId: null,
  winnerId: null,
  loserId: null,
  countdown: null,
});

export const useDuelStore = defineStore("duel", () => {
  const actors = ref<OverlayActor[]>([]);
  const duel = ref<ActiveDuel>(idleDuel());
  const cooldownUntil = ref<string | null>(null);

  function setOverlayState(payload: {
    actors?: OverlayActor[];
    duel?: ActiveDuel | null;
    cooldownUntil?: string | null;
  }) {
    if (payload.actors) actors.value = payload.actors;
    duel.value = payload.duel ?? idleDuel();
    if (payload.cooldownUntil !== undefined) {
      cooldownUntil.value = payload.cooldownUntil;
    }
  }

  function upsertActor(actor: OverlayActor) {
    const index = actors.value.findIndex((item) => item.chatterId === actor.chatterId);
    if (index === -1) {
      actors.value = [...actors.value, actor];
      return;
    }
    const next = actors.value.slice();
    next[index] = { ...next[index], ...actor };
    actors.value = next;
  }

  function setActorStatus(chatterId: number, status: HeroStatus, extra: Partial<OverlayActor> = {}) {
    const current = actors.value.find((item) => item.chatterId === chatterId);
    if (!current) return;
    upsertActor({ ...current, ...extra, status });
  }

  function startDuel(challenger: OverlayActor, opponent: OverlayActor) {
    upsertActor({ ...challenger, status: "duel", inDuel: true });
    upsertActor({ ...opponent, status: "duel", inDuel: true });
    duel.value = {
      phase: "start",
      challengerId: challenger.chatterId,
      opponentId: opponent.chatterId,
      winnerId: null,
      loserId: null,
      countdown: null,
    };
  }

  function setReady() {
    duel.value = { ...duel.value, phase: "ready", countdown: null };
  }

  function setCountdown(value: number) {
    duel.value = { ...duel.value, phase: "countdown", countdown: value };
  }

  function setResult(winnerId: number, loserId: number, lyingUntil: string | null, nextCooldown: string | null) {
    setActorStatus(winnerId, "patrol", { inDuel: false });
    setActorStatus(loserId, "lying", { inDuel: false, lyingUntil });
    duel.value = {
      ...duel.value,
      phase: "result",
      winnerId,
      loserId,
      countdown: null,
    };
    cooldownUntil.value = nextCooldown;
  }

  function revive(userId: number) {
    setActorStatus(userId, "patrol", { lyingUntil: null, inDuel: false });
    if (duel.value.loserId === userId) {
      duel.value = idleDuel();
    }
  }

  function isLying(chatterId: number, now = Date.now()) {
    const actor = actors.value.find((item) => item.chatterId === chatterId);
    if (!actor) return false;
    if (actor.lyingUntil) return new Date(actor.lyingUntil).getTime() > now;
    return actor.status === "lying";
  }

  return {
    actors,
    duel,
    cooldownUntil,
    setOverlayState,
    upsertActor,
    setActorStatus,
    startDuel,
    setReady,
    setCountdown,
    setResult,
    revive,
    isLying,
  };
});
