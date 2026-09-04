import { defineStore } from "pinia";
import { ref } from "vue";
import type { Chatter } from "@/types/chatter";
import type { Pagination } from "@/types/api";

function patchList(list: Chatter[], chatter: Chatter): Chatter[] {
  const index = list.findIndex((item) => item.id === chatter.id);
  if (index === -1) {
    return [chatter, ...list];
  }
  const next = list.slice();
  next[index] = { ...next[index], ...chatter };
  return next;
}

export const useChatterStore = defineStore("chatter", () => {
  const chatters = ref<Chatter[]>([]);
  const overlayChatters = ref<Chatter[]>([]);
  const pagination = ref<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  function setChatters(next: Chatter[], nextPagination?: Pagination) {
    chatters.value = next;
    if (nextPagination) pagination.value = nextPagination;
  }

  function setOverlayChatters(next: Chatter[]) {
    overlayChatters.value = next;
  }

  function upsertChatter(chatter: Chatter) {
    const existed = chatters.value.some((item) => item.id === chatter.id);
    chatters.value = patchList(chatters.value, chatter);
    overlayChatters.value = patchList(overlayChatters.value, chatter);
    if (!existed) pagination.value.total += 1;
  }

  function removeChatter(chatterId: number) {
    const existed = chatters.value.some((item) => item.id === chatterId);
    chatters.value = chatters.value.filter((item) => item.id !== chatterId);
    overlayChatters.value = overlayChatters.value.filter((item) => item.id !== chatterId);
    if (existed) {
      pagination.value.total = Math.max(0, pagination.value.total - 1);
    }
  }

  function applyNewMessage(payload: {
    chatterId: number | null;
    username: string;
    heroId: number | null;
    chatterTwitchId?: string | null;
    timestamp: number;
    source?: string;
  }) {
    if (payload.source === "test" || !payload.chatterId) return;

    const patch = {
      lastSeen: new Date(payload.timestamp).toISOString(),
      heroId: payload.heroId,
    };

    const tableIndex = chatters.value.findIndex((item) => item.id === payload.chatterId);
    if (tableIndex !== -1) {
      const current = chatters.value[tableIndex];
      chatters.value[tableIndex] = {
        ...current,
        ...patch,
        messageCount: (current.messageCount || 0) + 1,
      };
    }

    const overlayIndex = overlayChatters.value.findIndex((item) => item.id === payload.chatterId);
    if (overlayIndex === -1) {
      overlayChatters.value = [
        {
          id: payload.chatterId,
          twitchId: payload.chatterTwitchId || "",
          username: payload.username,
          displayName: payload.username,
          profileImageUrl: null,
          heroId: payload.heroId,
          hero: payload.heroId ? { id: payload.heroId, name: "" } : null,
          lastSeen: patch.lastSeen,
          messageCount: 1,
        },
        ...overlayChatters.value,
      ];
      return;
    }

    const current = overlayChatters.value[overlayIndex];
    overlayChatters.value[overlayIndex] = {
      ...current,
      ...patch,
      username: payload.username || current.username,
      displayName: current.displayName || payload.username,
      messageCount: (current.messageCount || 0) + 1,
      hero: payload.heroId
        ? { id: payload.heroId, name: current.hero?.name || "" }
        : null,
    };
  }

  return {
    chatters,
    overlayChatters,
    pagination,
    setChatters,
    setOverlayChatters,
    upsertChatter,
    removeChatter,
    applyNewMessage,
  };
});
