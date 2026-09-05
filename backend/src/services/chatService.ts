import { EventSubWsListener } from "@twurple/eventsub-ws";
import type { Server as SocketServer } from "socket.io";
import { getTwitchConfig } from "../config/twitch.js";
import { upsertChatterFromTwitch } from "../models/Chatter.js";
import { serializeHero } from "../models/Hero.js";
import { insertMessage } from "../models/Message.js";
import { setSetting } from "../models/Settings.js";
import { handleCommand, isCommandText } from "./commandHandler.js";
import { attachDuelChat } from "./duelService.js";
import { serializeChatter } from "./heroAssignment.js";
import { ensurePersonalHero } from "./heroFactory.js";
import { attachSocket as attachRealtime, emitToClients } from "./realtime.js";
import { getApiClient, getAuthStatus } from "./twitchService.js";
import type {
  ChatterRow,
  ChatterWithHeroRow,
  EventSubStatusName,
  HeroRow,
} from "../types.js";

let listener: EventSubWsListener | null = null;
let status: EventSubStatusName = "disconnected";

export { emitToClients } from "./realtime.js";

function emitConnectionStatus(
  nextStatus: EventSubStatusName,
  extra: Record<string, unknown> = {},
) {
  status = nextStatus;
  setSetting("eventsub_enabled", nextStatus === "connected" ? "true" : "false");
  const auth = getAuthStatus();
  const payload = {
    status: nextStatus,
    broadcasterId: auth.broadcasterId || extra.broadcasterId || "",
    broadcasterName: auth.username || extra.broadcasterName || "",
    timestamp: Date.now(),
    ...extra,
  };
  emitToClients("connection_status", payload);
  return payload;
}

export function emitHeroChange(
  chatter: ChatterWithHeroRow,
  hero: HeroRow | null | undefined,
): void {
  const timestamp = Date.now();
  if (hero) {
    emitToClients("hero_assigned", {
      chatterId: chatter.id,
      chatterUsername: chatter.username,
      heroId: hero.id,
      heroName: hero.name,
      timestamp,
    });
  }
  emitToClients("chatter_updated", {
    chatterId: chatter.id,
    chatter: serializeChatter(chatter),
    timestamp,
  });
}

export function attachSocket(socketServer: SocketServer): void {
  attachRealtime(socketServer);
  attachDuelChat(sendChatReply);
}

export function getEventSubStatus() {
  const auth = getAuthStatus();
  return {
    status,
    connected: status === "connected",
    broadcasterId: auth.broadcasterId,
    broadcasterName: auth.username,
  };
}

export function isEventSubConnected(): boolean {
  return status === "connected";
}

export async function stopChatListener(): Promise<void> {
  if (listener) {
    try {
      listener.stop();
    } catch (error) {
      console.error("Failed to stop EventSub listener:", error);
    }
    listener = null;
  }
  if (status !== "disconnected") {
    emitConnectionStatus("disconnected");
  }
}

function isCommand(text: string): boolean {
  return isCommandText(text);
}

async function sendChatReply(message: string, type = "info"): Promise<void> {
  emitToClients("system_message", {
    message,
    type,
    timestamp: Date.now(),
  });

  const apiClient = getApiClient();
  const auth = getAuthStatus();
  if (!apiClient || !auth.broadcasterId) {
    return;
  }

  try {
    await apiClient.chat.sendChatMessage(auth.broadcasterId, message);
  } catch (error) {
    console.error("Failed to send Twitch chat reply:", error);
  }
}

function maybeAssignPersonalHero(chatter: ChatterRow): ChatterRow {
  const result = ensurePersonalHero(chatter);
  if (result.created) {
    emitToClients("hero_created", {
      hero: serializeHero(result.hero),
      timestamp: Date.now(),
    });
    emitHeroChange(result.chatter, result.hero);
    console.log(`Personal hero created for ${result.chatter.username}`);
  }
  return result.chatter;
}

type ChatMessageEvent = {
  messageText: string;
  chatterId: string;
  chatterName: string;
  chatterDisplayName: string;
};

async function handleChatMessage(event: ChatMessageEvent): Promise<void> {
  const text = event.messageText || "";
  let chatter: ChatterRow = upsertChatterFromTwitch({
    twitchId: event.chatterId,
    username: event.chatterName,
    displayName: event.chatterDisplayName,
  });

  chatter = maybeAssignPersonalHero(chatter);

  insertMessage({
    chatterId: chatter.id,
    heroId: chatter.hero_id,
    message: text,
    isCommand: isCommand(text),
  });

  const payload = {
    chatterId: chatter.id,
    chatterTwitchId: chatter.twitch_id,
    username: chatter.display_name || chatter.username,
    heroId: chatter.hero_id,
    message: text,
    timestamp: Date.now(),
  };

  emitToClients("new_message", payload);
  console.log(`chat ${payload.username}: ${text}`);

  const command = handleCommand({ chatter, text });
  if (!command.handled) {
    return;
  }
  if (command.hero && command.chatter) {
    emitHeroChange(command.chatter, command.hero);
  }
  if (command.reply) {
    await sendChatReply(command.reply, command.type || "info");
  }
}

export async function startChatListener(): Promise<boolean> {
  await stopChatListener();

  const apiClient = getApiClient();
  const auth = getAuthStatus();
  if (!apiClient || !auth.authorized || !auth.broadcasterId) {
    console.log("EventSub not started — Twitch user is not authorized yet");
    emitConnectionStatus("disconnected");
    return false;
  }

  emitConnectionStatus("connecting");

  try {
    const { eventSubWsUrl } = getTwitchConfig();
    listener = new EventSubWsListener({
      apiClient,
      url: eventSubWsUrl,
    });

    listener.onUserSocketConnect((userId) => {
      console.log(`EventSub WebSocket connected for user ${userId}`);
      emitConnectionStatus("connected");
    });

    listener.onUserSocketDisconnect((userId, error) => {
      if (error) {
        console.error(`EventSub WebSocket disconnected for ${userId}:`, error);
        emitConnectionStatus("error", { error: error.message });
        return;
      }
      console.log(`EventSub WebSocket disconnected for user ${userId}`);
      emitConnectionStatus("disconnected");
    });

    listener.onRevoke((subscription, revokeStatus) => {
      console.error(
        `EventSub subscription revoked (${revokeStatus}): ${subscription.id}`,
      );
      emitConnectionStatus("error", {
        error: `Subscription revoked: ${revokeStatus}`,
      });
    });

    listener.onChannelChatMessage(
      auth.broadcasterId,
      auth.broadcasterId,
      (event) => {
        handleChatMessage(event).catch((error: unknown) => {
          console.error("Failed to handle chat message:", error);
        });
      },
    );

    listener.start();
    console.log(
      `EventSub listening for channel.chat.message as ${auth.username} (${auth.broadcasterId})`,
    );
    return true;
  } catch (error) {
    console.error("Failed to start EventSub listener:", error);
    listener = null;
    emitConnectionStatus("error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
