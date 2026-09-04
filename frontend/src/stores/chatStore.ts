import { defineStore } from "pinia";
import { ref } from "vue";

export interface ChatMessage {
  chatterId: number | null;
  chatterTwitchId?: string | null;
  username: string;
  heroId: number | null;
  message: string;
  timestamp: number;
  source?: "twitch" | "test";
  duration?: number;
}

export interface HeroActivation {
  chatterId: number | null;
  username: string;
  heroId: number;
  message: string;
  timestamp: number;
}

const MAX_ACTIVE = 6;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useChatStore = defineStore("chat", () => {
  const lastMessage = ref<ChatMessage | null>(null);
  const recentMessages = ref<ChatMessage[]>([]);
  const activations = ref<HeroActivation[]>([]);
  const connected = ref(false);
  const eventSubStatus = ref("disconnected");

  function setConnected(value: boolean) {
    connected.value = value;
  }

  function setEventSubStatus(value: string) {
    eventSubStatus.value = value;
  }

  function setLastMessage(message: ChatMessage) {
    lastMessage.value = message;
    if (message.source === "test") return;
    recentMessages.value = [message, ...recentMessages.value].slice(0, 50);
  }

  function activateHero(message: ChatMessage, durationMs: number) {
    if (message.source === "test") return;
    if (!message.chatterId || !message.heroId) return;
    if (message.message.trim().startsWith("\\")) return;

    const chatterId = message.chatterId;
    const activation: HeroActivation = {
      chatterId,
      username: message.username,
      heroId: message.heroId,
      message: message.message,
      timestamp: message.timestamp,
    };

    const next = activations.value.filter(
      (item) => item.chatterId !== chatterId,
    );
    next.push(activation);
    next.sort((a, b) => a.timestamp - b.timestamp);
    while (next.length > MAX_ACTIVE) {
      const dropped = next.shift();
      if (dropped?.chatterId) {
        const timer = timers.get(dropped.chatterId);
        if (timer) clearTimeout(timer);
        timers.delete(dropped.chatterId);
      }
    }
    activations.value = next;

    const previous = timers.get(chatterId);
    if (previous) clearTimeout(previous);
    const holdMs = Math.max(500, message.duration || durationMs || 5000);
    timers.set(
      chatterId,
      setTimeout(() => {
        activations.value = activations.value.filter(
          (item) => item.chatterId !== chatterId,
        );
        timers.delete(chatterId);
      }, holdMs),
    );
  }

  function clearActivations() {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    activations.value = [];
  }

  function deactivateChatter(chatterId: number) {
    const timer = timers.get(chatterId);
    if (timer) clearTimeout(timer);
    timers.delete(chatterId);
    activations.value = activations.value.filter(
      (item) => item.chatterId !== chatterId,
    );
  }

  function isHeroActive(heroId: number) {
    return activations.value.some((item) => item.heroId === heroId);
  }

  function activationFor(heroId: number) {
    return activations.value.find((item) => item.heroId === heroId) ?? null;
  }

  return {
    lastMessage,
    recentMessages,
    activations,
    connected,
    eventSubStatus,
    setConnected,
    setEventSubStatus,
    setLastMessage,
    activateHero,
    clearActivations,
    deactivateChatter,
    isHeroActive,
    activationFor,
  };
});
