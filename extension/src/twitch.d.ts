export type TwitchExtAuth = {
  channelId: string;
  clientId: string;
  token: string;
  helixToken: string;
  userId: string;
};

export type TwitchExtContext = {
  theme?: "light" | "dark";
  mode?: "viewer" | "dashboard" | "config";
};

export type TwitchExtViewer = {
  opaqueId: string;
  id: string | null;
  role: string;
  isLinked: boolean;
};

export type TwitchExt = {
  onAuthorized: (callback: (auth: TwitchExtAuth) => void) => void;
  onContext: (callback: (context: TwitchExtContext) => void) => void;
  onError?: (callback: (error: unknown) => void) => void;
  actions: {
    requestIdShare: () => void;
  };
  viewer: TwitchExtViewer;
};

declare global {
  interface Window {
    Twitch?: { ext: TwitchExt };
  }
}

export {};
