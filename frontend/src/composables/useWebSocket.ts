import { io, type Socket } from "socket.io-client";
import { onMounted, onUnmounted, ref } from "vue";
import { useAppStore, type AppStats } from "@/stores/appStore";
import { useChatStore, type ChatMessage } from "@/stores/chatStore";
import { useChatterStore } from "@/stores/chatterStore";
import { useHeroStore } from "@/stores/heroStore";
import type { Chatter } from "@/types/chatter";
import type { Hero } from "@/types/hero";

let socket: Socket | null = null;
let refCount = 0;
const ready = ref(false);

export function useWebSocket() {
  const appStore = useAppStore();
  const heroStore = useHeroStore();
  const chatStore = useChatStore();
  const chatterStore = useChatterStore();

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
      const hero = heroStore.heroes.find((item) => item.id === payload.heroId);
      chatStore.activateHero(payload, payload.duration ?? hero?.bubbleDuration ?? 5000);
      chatterStore.applyNewMessage(payload);
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
