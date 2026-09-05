import type { HeroConfig } from "./services/heroAppearance.js";

export type { HeroConfig };

export type HeroStatus = "patrol" | "duel" | "lying";

export type HeroRow = {
  id: number;
  name: string;
  gif_url: string;
  width: number;
  height: number;
  active_width: number;
  active_height: number;
  bubble_color: string;
  font_size: number;
  font_color: string;
  bubble_duration: number;
  user_id: number | null;
  config: string | null;
  created_at: string;
  updated_at: string | null;
};

export type SerializedHero = {
  id: number;
  name: string;
  gifUrl: string;
  width: number;
  height: number;
  activeWidth: number;
  activeHeight: number;
  bubbleColor: string;
  fontSize: number;
  fontColor: string;
  bubbleDuration: number;
  userId: number | null;
  username: string | null;
  config: HeroConfig;
  status: HeroStatus;
  lyingUntil: string | null;
};

export type HeroWrite = {
  name: string;
  gifUrl?: string;
  width: number;
  height: number;
  activeWidth: number;
  activeHeight: number;
  bubbleColor: string;
  fontSize: number;
  fontColor: string;
  bubbleDuration: number;
  userId?: number | null;
  config?: HeroConfig | string | null;
};

export type HeroPatch = Partial<HeroWrite>;

export type PopularHeroRow = {
  id: number;
  name: string;
  chatterCount: number;
};

export type ChatterRow = {
  id: number;
  twitch_id: string;
  username: string;
  display_name: string | null;
  profile_image_url: string | null;
  hero_id: number | null;
  assigned_at: string | null;
  last_seen: string;
  created_at: string;
  wins: number;
  losses: number;
  lying_until: string | null;
  in_duel: number;
};

export type ChatterWithHeroRow = ChatterRow & {
  hero_name: string | null;
  message_count: number;
};

export type SerializedChatter = {
  id: number;
  twitchId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  heroId: number | null;
  hero: { id: number; name: string } | null;
  lastSeen: string;
  assignedAt: string | null;
  messageCount: number;
  totalMessages: number;
  wins: number;
  losses: number;
  lyingUntil: string | null;
  inDuel: boolean;
  status: HeroStatus;
};

export type DuelRow = {
  id: number;
  challenger_id: number;
  opponent_id: number;
  winner_id: number | null;
  loser_id: number | null;
  started_at: string;
  finished_at: string | null;
};

export type OverlayActor = {
  chatterId: number;
  username: string;
  displayName: string;
  wins: number;
  losses: number;
  status: HeroStatus;
  lyingUntil: string | null;
  inDuel: boolean;
  hero: SerializedHero;
};

export type ActiveDuelSnapshot = {
  phase: "start" | "ready" | "countdown" | "result";
  challengerId: number;
  opponentId: number;
  winnerId: number | null;
  loserId: number | null;
  countdown: number | null;
};

export type OverlayState = {
  actors: OverlayActor[];
  duel: ActiveDuelSnapshot | null;
  cooldownUntil: string | null;
};

export type TwitchChatterInput = {
  twitchId: string;
  username: string;
  displayName?: string | null;
  profileImageUrl?: string | null;
};

export type MessageInsert = {
  chatterId: number;
  heroId: number | null;
  message: string;
  isCommand: boolean;
};

export type RecentMessageRow = {
  id: number;
  message: string;
  is_command: number;
  sent_at: string;
  chatter_id: number;
  twitch_id: string;
  username: string;
  display_name: string | null;
  hero_id: number | null;
};

export type SettingsMap = Record<string, string | null>;
export type PublicSettings = Record<string, string | boolean | null>;

export type EventSubStatusName =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type StatsSnapshot = {
  totalChatters: number;
  totalHeroes: number;
  totalMessages: number;
  messagesToday: number;
  activeChattersToday: number;
  mostPopularHero: {
    id: number;
    name: string;
    chatterCount: number;
  } | null;
};

export type AssignOk = {
  ok: true;
  chatter: ChatterWithHeroRow;
  hero: HeroRow | null;
};

export type AssignFail = {
  ok: false;
  error: string;
  heroName?: string;
};

export type AssignResult = AssignOk | AssignFail;

export type CommandResult =
  | { handled: false }
  | {
      handled: true;
      type: "info" | "error" | "success";
      reply: string;
      chatter?: ChatterWithHeroRow;
      hero?: HeroRow;
    };
