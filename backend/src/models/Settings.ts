import { getDb } from "../config/database.js";
import type { PublicSettings, SettingsMap } from "../types.js";

const PUBLIC_SETTING_KEYS = new Set([
  "twitch_broadcaster_id",
  "twitch_username",
  "twitch_display_name",
  "twitch_profile_image_url",
  "eventsub_enabled",
]);

type SettingRow = { key: string; value: string | null };

export function getAllSettings(): SettingsMap {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as SettingRow[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function getSetting(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string | null } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string | number | boolean | null): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value == null ? null : String(value));
}

export function setSettings(entries: Record<string, string | number | boolean | null>): void {
  const upsert = getDb().transaction((obj: Record<string, string | number | boolean | null>) => {
    for (const [key, value] of Object.entries(obj)) {
      setSetting(key, value);
    }
  });
  upsert(entries);
}

export function getPublicSettings(): PublicSettings {
  const all = getAllSettings();
  const publicSettings: PublicSettings = {};
  for (const key of PUBLIC_SETTING_KEYS) {
    if (key in all) publicSettings[key] = all[key];
  }
  publicSettings.eventsub_enabled = all.eventsub_enabled === "true";
  return publicSettings;
}
