import type { Hero } from "./hero";

export type OverlaySlot = {
  id: number;
  hero: Hero;
  username: string;
};

export type TestChatter = {
  id: number;
  username: string;
  heroId: number | null;
  text: string;
  duration: number;
};
