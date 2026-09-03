import crypto from "node:crypto";
import { ApiClient } from "@twurple/api";
import type { HelixUser } from "@twurple/api";
import {
  exchangeCode,
  RefreshingAuthProvider,
} from "@twurple/auth";
import type { AccessToken } from "@twurple/auth";
import { getTwitchConfig } from "../config/twitch.js";
import { HttpError } from "../errors.js";
import { getSetting, setSettings } from "../models/Settings.js";

const USER_INTENTS = ["chat"];
const STATE_TTL_MS = 10 * 60 * 1000;
const pendingStates = new Map<string, number>();

let authProvider: RefreshingAuthProvider | null = null;
let apiClient: ApiClient | null = null;

function pruneExpiredStates(now = Date.now()): void {
  for (const [state, expiresAt] of pendingStates) {
    if (expiresAt <= now) pendingStates.delete(state);
  }
}

export function isTwitchConfigured(): boolean {
  const { clientId, clientSecret } = getTwitchConfig();
  return Boolean(
    clientId &&
      clientSecret &&
      clientId !== "your_client_id" &&
      clientSecret !== "your_client_secret",
  );
}

export function getAuthProvider(): RefreshingAuthProvider | null {
  return authProvider;
}

export function getApiClient(): ApiClient | null {
  return apiClient;
}

export function getAuthStatus() {
  const broadcasterId = getSetting("twitch_broadcaster_id");
  const refreshToken = getSetting("twitch_refresh_token");
  return {
    configured: isTwitchConfigured(),
    authorized: Boolean(broadcasterId && refreshToken),
    broadcasterId,
    username: getSetting("twitch_username"),
    displayName: getSetting("twitch_display_name"),
    profileImageUrl: getSetting("twitch_profile_image_url"),
  };
}

function persistTokens(userId: string, token: AccessToken): void {
  setSettings({
    twitch_client_id: getTwitchConfig().clientId,
    twitch_broadcaster_id: userId,
    twitch_access_token: token.accessToken,
    twitch_refresh_token: token.refreshToken || "",
    twitch_token_expires_in: String(token.expiresIn ?? ""),
    twitch_token_obtainment_timestamp: String(
      token.obtainmentTimestamp ?? Date.now(),
    ),
    twitch_token_scope: JSON.stringify(token.scope || []),
  });
}

function persistUser(user: HelixUser): void {
  setSettings({
    twitch_broadcaster_id: user.id,
    twitch_username: user.name,
    twitch_display_name: user.displayName,
    twitch_profile_image_url: user.profilePictureUrl || "",
  });
}

function createProvider(): RefreshingAuthProvider {
  const { clientId, clientSecret, redirectUri } = getTwitchConfig();
  const provider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
    redirectUri,
  });

  provider.onRefresh((userId, token) => {
    console.log(`Twitch token refreshed for user ${userId}`);
    persistTokens(userId, token);
  });

  provider.onRefreshFailure((userId, error) => {
    console.error(`Twitch token refresh failed for user ${userId}:`, error);
  });

  return provider;
}

function requireConfig(): void {
  if (!isTwitchConfigured()) {
    throw new HttpError(
      "Twitch Client ID and Secret are not set in backend/.env. Register an app at https://dev.twitch.tv/console",
      500,
    );
  }
}

export function getAuthorizationUrl(): string {
  requireConfig();
  pruneExpiredStates();

  const { clientId, redirectUri, scopes } = getTwitchConfig();
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, Date.now() + STATE_TTL_MS);

  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

async function bindUser(tokenData: AccessToken): Promise<HelixUser> {
  authProvider = createProvider();
  const userId = await authProvider.addUserForToken(tokenData, USER_INTENTS);
  apiClient = new ApiClient({ authProvider });
  persistTokens(userId, tokenData);

  const user = await apiClient.users.getAuthenticatedUser(userId, true);
  persistUser(user);
  return user;
}

export async function handleOAuthCallback(
  code: string,
  state: string,
): Promise<HelixUser> {
  requireConfig();
  pruneExpiredStates();

  if (!code) {
    throw new HttpError("Missing authorization code", 400);
  }
  if (!state || !pendingStates.has(state)) {
    throw new HttpError("Invalid or expired OAuth state", 400);
  }
  pendingStates.delete(state);

  const { clientId, clientSecret, redirectUri } = getTwitchConfig();
  const tokenData = await exchangeCode(
    clientId,
    clientSecret,
    code,
    redirectUri,
  );
  const user = await bindUser(tokenData);
  console.log(`Twitch authorized as ${user.name} (${user.id})`);
  return user;
}

export async function restoreAuthFromDb(): Promise<boolean> {
  if (!isTwitchConfigured()) {
    console.log("Twitch OAuth is not configured yet (set TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET)");
    return false;
  }

  const refreshToken = getSetting("twitch_refresh_token");
  const userId = getSetting("twitch_broadcaster_id");
  if (!refreshToken || !userId) {
    console.log("No saved Twitch tokens — streamer needs to authorize");
    return false;
  }

  try {
    authProvider = createProvider();
    authProvider.addUser(
      userId,
      {
        accessToken: getSetting("twitch_access_token") || "",
        refreshToken,
        expiresIn: Number(getSetting("twitch_token_expires_in") || 0),
        obtainmentTimestamp: Number(
          getSetting("twitch_token_obtainment_timestamp") || 0,
        ),
        scope: JSON.parse(getSetting("twitch_token_scope") || "[]") as string[],
      },
      USER_INTENTS,
    );
    apiClient = new ApiClient({ authProvider });

    const user = await apiClient.users.getAuthenticatedUser(userId);
    persistUser(user);
    console.log(`Twitch auth restored for ${user.name} (${user.id})`);
    return true;
  } catch (error) {
    console.error("Failed to restore Twitch auth from database:", error);
    authProvider = null;
    apiClient = null;
    return false;
  }
}
