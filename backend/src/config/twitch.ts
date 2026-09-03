export type TwitchConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  broadcasterId: string;
  eventSubWsUrl: string;
  scopes: string[];
};

export function getTwitchConfig(): TwitchConfig {
  return {
    clientId: process.env.TWITCH_CLIENT_ID || "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
    redirectUri:
      process.env.TWITCH_REDIRECT_URI ||
      "http://localhost:3000/api/auth/twitch/callback",
    broadcasterId: process.env.TWITCH_BROADCASTER_ID || "",
    eventSubWsUrl:
      process.env.EVENTSUB_WS_URL || "wss://eventsub.wss.twitch.tv/ws",
    scopes: [
      "chat:read",
      "chat:edit",
      "user:read:email",
      "user:read:chat",
      "user:write:chat",
      "user:bot",
      "channel:bot",
    ],
  };
}
