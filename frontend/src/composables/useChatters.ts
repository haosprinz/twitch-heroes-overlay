import { useAppStore } from "@/stores/appStore";
import type { Chatter } from "@/types/chatter";
import type { Pagination } from "@/types/api";

function assertOk(data: { success: boolean; error?: string }, fallback: string) {
  if (!data.success) {
    throw new Error(data.error || fallback);
  }
}

export function useChatters() {
  const appStore = useAppStore();

  async function fetchChatters(page = 1, limit = 25, search = "") {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set("search", search);

    const response = await fetch(`${appStore.apiUrl}/api/chatters?${params}`);
    const data = await response.json();
    assertOk(data, "Failed to fetch chatters");
    return {
      chatters: data.chatters as Chatter[],
      pagination: data.pagination as Pagination,
    };
  }

  async function updateChatterHero(
    chatterId: number,
    payload: Record<string, unknown>,
  ) {
    const response = await fetch(`${appStore.apiUrl}/api/chatters/${chatterId}/hero`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    assertOk(data, "Failed to update hero");
    return data;
  }

  async function resetHero(chatterId: number) {
    const response = await fetch(`${appStore.apiUrl}/api/chatters/${chatterId}/hero`, {
      method: "DELETE",
    });
    const data = await response.json();
    assertOk(data, "Failed to reset hero");
    return data;
  }

  async function ensureHero(chatterId: number) {
    const response = await fetch(`${appStore.apiUrl}/api/chatters/${chatterId}/ensure-hero`, {
      method: "POST",
    });
    const data = await response.json();
    assertOk(data, "Failed to ensure hero");
    return {
      chatter: data.chatter as Chatter,
      hero: data.hero as { id: number; name: string } | null,
    };
  }

  async function deleteChatter(chatterId: number) {
    const response = await fetch(`${appStore.apiUrl}/api/chatters/${chatterId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    assertOk(data, "Failed to delete chatter");
    return data.chatter as { id: number };
  }

  return { fetchChatters, updateChatterHero, resetHero, ensureHero, deleteChatter };
}
