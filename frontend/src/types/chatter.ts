import type { Hero } from "./hero";

export interface Chatter {
  id: number;
  twitchId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  heroId: number | null;
  hero: Pick<Hero, "id" | "name"> | null;
  lastSeen: string | null;
  messageCount?: number;
}
