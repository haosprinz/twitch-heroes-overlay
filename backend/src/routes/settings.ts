import { Router } from "express";
import { getPublicSettings, setSettings } from "../models/Settings.js";
import { isEventSubConnected } from "../services/chatService.js";
import { getTwitchConfig, isExtensionConfigured } from "../config/twitch.js";
import { isTwitchConfigured } from "../services/twitchService.js";
import type { PublicSettings } from "../types.js";

const router = Router();

const BLOCKED_SETTING_KEYS = new Set([
  "twitch_access_token",
  "twitch_refresh_token",
  "twitch_client_secret",
]);

function withFlags(settings: PublicSettings) {
  return {
    ...settings,
    twitch_configured: isTwitchConfigured(),
    eventsub_enabled: isEventSubConnected(),
    extension_configured: isExtensionConfigured(),
    extension_dev_bypass: getTwitchConfig().extensionDevBypass,
  };
}

router.get("/", (_req, res) => {
  res.json({ success: true, settings: withFlags(getPublicSettings()) });
});

router.put("/", (req, res) => {
  const body: unknown = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ success: false, error: "JSON object is required" });
    return;
  }

  const entriesSource = body as Record<string, unknown>;
  const blocked = Object.keys(entriesSource).filter((key) =>
    BLOCKED_SETTING_KEYS.has(key),
  );
  if (blocked.length) {
    res.status(400).json({
      success: false,
      error: `Cannot update protected setting: ${blocked.join(", ")}`,
    });
    return;
  }

  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(entriesSource)) {
    if (typeof value === "boolean") {
      entries[key] = value ? "true" : "false";
    } else if (value == null) {
      entries[key] = "";
    } else {
      entries[key] = String(value);
    }
  }
  setSettings(entries);
  res.json({ success: true, settings: withFlags(getPublicSettings()) });
});

export default router;
