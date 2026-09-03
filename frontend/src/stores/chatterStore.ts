import { defineStore } from "pinia";
import { ref } from "vue";
import type { Chatter } from "@/types/chatter";
import type { Pagination } from "@/types/api";

export const useChatterStore = defineStore("chatter", () => {
  const chatters = ref<Chatter[]>([]);
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

  function upsertChatter(chatter: Chatter) {
    const index = chatters.value.findIndex((item) => item.id === chatter.id);
    if (index === -1) {
      chatters.value = [chatter, ...chatters.value];
      pagination.value.total += 1;
      return;
    }
    chatters.value[index] = { ...chatters.value[index], ...chatter };
  }

  function applyNewMessage(payload: {
    chatterId: number | null;
    username: string;
    heroId: number | null;
    timestamp: number;
  }) {
    if (!payload.chatterId) return;
    const index = chatters.value.findIndex((item) => item.id === payload.chatterId);
    if (index === -1) return;
    const current = chatters.value[index];
    chatters.value[index] = {
      ...current,
      lastSeen: new Date(payload.timestamp).toISOString(),
      messageCount: (current.messageCount || 0) + 1,
      heroId: payload.heroId,
    };
  }

  return { chatters, pagination, setChatters, upsertChatter, applyNewMessage };
});
