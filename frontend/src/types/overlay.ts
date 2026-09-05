import type { Hero, HeroStatus } from "./hero";

export type OverlaySlot = {
  id: number;
  hero: Hero;
  username: string;
  status?: HeroStatus;
  lyingUntil?: string | null;
};

export type TestChatter = {
  id: number;
  username: string;
  hero: Hero;
  text: string;
  duration: number;
};
