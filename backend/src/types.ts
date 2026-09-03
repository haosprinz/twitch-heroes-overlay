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
};

export type HeroWrite = {
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
