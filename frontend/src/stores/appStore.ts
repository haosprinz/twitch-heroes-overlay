import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface PublicSettings {
  twitch_broadcaster_id?: string;
  twitch_username?: string;
  twitch_display_name?: string;
  twitch_profile_image_url?: string;
  twitch_configured?: boolean;
  eventsub_enabled?: boolean;
  extension_configured?: boolean;
  extension_dev_bypass?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface AppStats {
  totalChatters: number;
  totalHeroes: number;
  totalMessages: number;
  messagesToday: number;
  activeChattersToday: number;
  mostPopularHero: { id: number; name: string; chatterCount: number } | null;
}

export const useAppStore = defineStore("app", () => {
  const apiUrl = ref(import.meta.env.VITE_API_URL || "http://localhost:3000");
  const wsUrl = ref(import.meta.env.VITE_WS_URL || "http://localhost:3000");
  const settings = ref<PublicSettings>({});
  const settingsLoaded = ref(false);
  const settingsError = ref("");
  const stats = ref<AppStats | null>(null);

  const twitchConnected = computed(() => Boolean(settings.value.twitch_broadcaster_id));
  const twitchConfigured = computed(() => Boolean(settings.value.twitch_configured));
  const twitchUsername = computed(
    () => settings.value.twitch_display_name || settings.value.twitch_username || "",
  );

  async function loadSettings() {
    settingsError.value = "";
    try {
      const response = await fetch(`${apiUrl.value}/api/settings`);
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch settings");
      }
      settings.value = data.settings || {};
    } catch (error) {
      settingsError.value =
        error instanceof Error ? error.message : "Failed to fetch settings";
    } finally {
      settingsLoaded.value = true;
    }
  }

  function setStats(next: AppStats) {
    stats.value = next;
  }

  return {
    apiUrl,
    wsUrl,
    settings,
    settingsLoaded,
    settingsError,
    stats,
    twitchConnected,
    twitchConfigured,
    twitchUsername,
    loadSettings,
    setStats,
  };
});
