import { io, type Socket } from "socket.io-client";
import { onMounted, onUnmounted, ref } from "vue";
import { useAppStore, type AppStats } from "@/stores/appStore";
import { useChatStore, type ChatMessage } from "@/stores/chatStore";
import { useChatterStore } from "@/stores/chatterStore";
import { useDuelStore } from "@/stores/duelStore";
import { useHeroStore } from "@/stores/heroStore";
import type { Chatter } from "@/types/chatter";
import type { OverlayActor } from "@/types/duel";
import type { Hero } from "@/types/hero";

let socket: Socket | null = null;
let refCount = 0;
const ready = ref(false);

export function useWebSocket() {
  const appStore = useAppStore();
  const heroStore = useHeroStore();
  const chatStore = useChatStore();
  const chatterStore = useChatterStore();
  const duelStore = useDuelStore();

  function connect() {
    if (socket) {
      ready.value = socket.connected;
      return socket;
    }

    socket = io(appStore.wsUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      ready.value = true;
      chatStore.setConnected(true);
      socket?.emit("request_heroes");
      socket?.emit("request_overlay_state");
    });

    socket.on("disconnect", () => {
      ready.value = false;
      chatStore.setConnected(false);
    });

    socket.on(
      "connection_status",
      (payload: { status?: string; broadcasterName?: string }) => {
        chatStore.setEventSubStatus(payload.status || "disconnected");
        if (payload.status === "connected") {
          void appStore.loadSettings();
        }
      },
    );

    socket.on("stats_updated", (payload: { stats: AppStats }) => {
      if (payload.stats) appStore.setStats(payload.stats);
    });

    socket.on("heroes_list", (payload: { heroes: Hero[] }) => {
      heroStore.setHeroes(payload.heroes || []);
    });

    socket.on("hero_created", (payload: { hero: Hero }) => {
      heroStore.upsertHero(payload.hero);
    });

    socket.on("hero_updated", (payload: { hero: Hero }) => {
      heroStore.upsertHero(payload.hero);
    });

    socket.on("hero_deleted", (payload: { heroId: number }) => {
      heroStore.removeHero(payload.heroId);
    });

    socket.on("chatter_updated", (payload: { chatter: Chatter }) => {
      if (payload.chatter) chatterStore.upsertChatter(payload.chatter);
    });

    socket.on("chatter_deleted", (payload: { chatterId: number }) => {
      chatterStore.removeChatter(payload.chatterId);
      chatStore.deactivateChatter(payload.chatterId);
    });

    socket.on(
      "hero_assigned",
      (payload: { chatterId: number; heroId: number; heroName: string }) => {
        const current = chatterStore.chatters.find((item) => item.id === payload.chatterId);
        if (!current) return;
        chatterStore.upsertChatter({
          ...current,
          heroId: payload.heroId,
          hero: { id: payload.heroId, name: payload.heroName },
        });
      },
    );

    socket.on("new_message", (payload: ChatMessage) => {
      chatStore.setLastMessage(payload);
      if (payload.source === "test") return;
      if (payload.chatterId && duelStore.isLying(payload.chatterId)) return;
      const hero = heroStore.heroes.find((item) => item.id === payload.heroId);
      chatStore.activateHero(payload, payload.duration ?? hero?.bubbleDuration ?? 5000);
      chatterStore.applyNewMessage(payload);
    });

    socket.on("overlay_state", (payload: {
      actors?: OverlayActor[];
      duel?: {
        phase?: string;
        challengerId?: number | null;
        opponentId?: number | null;
        winnerId?: number | null;
        loserId?: number | null;
        countdown?: number | null;
      } | null;
      cooldownUntil?: string | null;
    }) => {
      duelStore.setOverlayState({
        actors: payload.actors || [],
        duel: payload.duel
          ? {
              phase: (payload.duel.phase as "idle") || "idle",
              challengerId: payload.duel.challengerId ?? null,
              opponentId: payload.duel.opponentId ?? null,
              winnerId: payload.duel.winnerId ?? null,
              loserId: payload.duel.loserId ?? null,
              countdown: payload.duel.countdown ?? null,
            }
          : null,
        cooldownUntil: payload.cooldownUntil ?? null,
      });
    });

    socket.on("duel:start", (payload: { challenger: OverlayActor; opponent: OverlayActor }) => {
      if (payload.challenger && payload.opponent) {
        duelStore.startDuel(payload.challenger, payload.opponent);
        if (payload.challenger.hero) heroStore.upsertHero(payload.challenger.hero);
        if (payload.opponent.hero) heroStore.upsertHero(payload.opponent.hero);
      }
    });

    socket.on("duel:ready", () => {
      duelStore.setReady();
    });

    socket.on("duel:countdown", (payload: { value?: number }) => {
      duelStore.setCountdown(Number(payload.value) || 0);
    });

    socket.on(
      "duel:result",
      (payload: {
        winnerId?: number;
        loserId?: number;
        lyingUntil?: string | null;
        cooldownUntil?: string | null;
        winner?: OverlayActor;
        loser?: OverlayActor;
      }) => {
        if (payload.winner) {
          chatterStore.upsertChatter({
            id: payload.winner.chatterId,
            twitchId: "",
            username: payload.winner.username,
            displayName: payload.winner.displayName,
            profileImageUrl: null,
            heroId: payload.winner.hero.id,
            hero: { id: payload.winner.hero.id, name: payload.winner.hero.name },
            lastSeen: new Date().toISOString(),
            wins: payload.winner.wins,
            losses: payload.winner.losses,
            status: "patrol",
          });
        }
        if (payload.loser) {
          chatterStore.upsertChatter({
            id: payload.loser.chatterId,
            twitchId: "",
            username: payload.loser.username,
            displayName: payload.loser.displayName,
            profileImageUrl: null,
            heroId: payload.loser.hero.id,
            hero: { id: payload.loser.hero.id, name: payload.loser.hero.name },
            lastSeen: new Date().toISOString(),
            wins: payload.loser.wins,
            losses: payload.loser.losses,
            status: "lying",
            lyingUntil: payload.lyingUntil ?? null,
          });
        }
        if (payload.winnerId && payload.loserId) {
          duelStore.setResult(
            payload.winnerId,
            payload.loserId,
            payload.lyingUntil ?? null,
            payload.cooldownUntil ?? null,
          );
        }
      },
    );

    socket.on("duel:revive", (payload: { userId?: number }) => {
      if (!payload.userId) return;
      duelStore.revive(payload.userId);
      const current = chatterStore.chatters.find((item) => item.id === payload.userId)
        ?? chatterStore.overlayChatters.find((item) => item.id === payload.userId);
      if (current) {
        chatterStore.upsertChatter({
          ...current,
          status: "patrol",
          lyingUntil: null,
          inDuel: false,
        });
      }
    });

    socket.on("overlay_reset", () => {
      chatStore.clearActivations();
    });

    socket.on(
      "system_message",
      (payload: { message: string; type?: string; timestamp: number }) => {
        chatStore.setLastMessage({
          chatterId: 0,
          username: "system",
          heroId: null,
          message: payload.message,
          timestamp: payload.timestamp,
        });
      },
    );

    return socket;
  }

  onMounted(() => {
    refCount += 1;
    connect();
  });

  onUnmounted(() => {
    refCount -= 1;
    if (refCount > 0) return;
    socket?.disconnect();
    socket = null;
    ready.value = false;
    chatStore.setConnected(false);
  });

  return { ready, connect };
}

export type TestMessageEmit = {
  text: string;
  heroId?: number | null;
  chatterId?: number | null;
  chatterName?: string;
  duration?: number;
};

export function emitTestMessage(payload: TestMessageEmit): boolean {
  if (!socket?.connected) return false;
  socket.emit("test_message", payload);
  return true;
}

export function emitTestResetOverlay(): boolean {
  if (!socket?.connected) return false;
  socket.emit("test_reset_overlay", {});
  return true;
}

export function emitTestDuel(challengerName: string, opponentName: string): boolean {
  if (!socket?.connected) return false;
  socket.emit("test_duel", { challengerName, opponentName });
  return true;
}
