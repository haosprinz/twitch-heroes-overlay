import type { Server as SocketServer } from "socket.io";
import { getEventSubStatus, emitHeroChange } from "../services/chatService.js";
import { assignHero, serializeChatter } from "../services/heroAssignment.js";
import { listChatters } from "../models/Chatter.js";
import { listHeroes, serializeHero } from "../models/Hero.js";
import { getStatsSnapshot } from "../services/statsService.js";
import { startTestDuel } from "../services/duelService.js";
import { getOverlayState } from "../services/overlayState.js";
import {
  handleTestMessage,
  handleTestResetOverlay,
  type TestMessagePayload,
} from "./testHandler.js";

type ChattersRequest = {
  page?: number;
  limit?: number;
};

type AssignHeroPayload = {
  chatterId?: number;
  heroId?: number;
};

export function createSocket(io: SocketServer): SocketServer {
  setInterval(() => {
    io.emit("stats_updated", {
      stats: getStatsSnapshot(),
      timestamp: Date.now(),
    });
  }, 10_000);

  io.on("connection", (socket) => {
    console.log(`socket connected: ${socket.id}`);
    socket.emit("connection_status", {
      ...getEventSubStatus(),
      timestamp: Date.now(),
    });
    socket.emit("stats_updated", {
      stats: getStatsSnapshot(),
      timestamp: Date.now(),
    });
    socket.emit("overlay_state", {
      ...getOverlayState(),
      timestamp: Date.now(),
    });

    socket.on("request_heroes", () => {
      socket.emit("heroes_list", {
        heroes: listHeroes().map(serializeHero),
        timestamp: Date.now(),
      });
    });

    socket.on("request_chatters", (payload: ChattersRequest = {}) => {
      const rows = listChatters();
      const safePage = Math.max(1, Number(payload.page) || 1);
      const safeLimit = Math.max(1, Number(payload.limit) || 50);
      const start = (safePage - 1) * safeLimit;
      const slice = rows.slice(start, start + safeLimit);
      socket.emit("chatters_list", {
        chatters: slice.map((row) => serializeChatter(row)).filter(Boolean),
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: rows.length,
          totalPages: Math.max(1, Math.ceil(rows.length / safeLimit)),
        },
        timestamp: Date.now(),
      });
    });

    socket.on("assign_hero", (payload: AssignHeroPayload = {}) => {
      const result = assignHero(Number(payload.chatterId), Number(payload.heroId));
      if (!result.ok) {
        socket.emit("system_message", {
          message: result.error,
          type: "error",
          timestamp: Date.now(),
        });
        return;
      }
      emitHeroChange(result.chatter, result.hero);
    });

    socket.on("test_message", (payload: TestMessagePayload = {}) => {
      handleTestMessage(payload);
    });

    socket.on("test_reset_overlay", () => {
      handleTestResetOverlay();
    });

    socket.on("request_overlay_state", () => {
      socket.emit("overlay_state", {
        ...getOverlayState(),
        timestamp: Date.now(),
      });
    });

    socket.on(
      "test_duel",
      (payload: { challengerName?: string; opponentName?: string } = {}) => {
        const result = startTestDuel(
          String(payload.challengerName || "alice"),
          String(payload.opponentName || "bob"),
        );
        if (result.handled && result.reply) {
          socket.emit("system_message", {
            message: result.reply,
            type: result.type || "info",
            timestamp: Date.now(),
          });
        }
      },
    );

    socket.on("subscribe_to_events", (payload?: { events?: string[] }) => {
      socket.data.events = payload?.events || [];
    });

    socket.on("disconnect", (reason) => {
      console.log(`socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}
