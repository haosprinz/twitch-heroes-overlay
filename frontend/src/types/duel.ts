import type { Hero, HeroStatus } from "./hero";

export type DuelPhase = "idle" | "start" | "ready" | "countdown" | "result";

export type OverlayActor = {
  chatterId: number;
  username: string;
  displayName: string;
  wins: number;
  losses: number;
  status: HeroStatus;
  lyingUntil: string | null;
  inDuel: boolean;
  hero: Hero;
};

export type ActiveDuel = {
  phase: DuelPhase;
  challengerId: number | null;
  opponentId: number | null;
  winnerId: number | null;
  loserId: number | null;
  countdown: number | null;
};
