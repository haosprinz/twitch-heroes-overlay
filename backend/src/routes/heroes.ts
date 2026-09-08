import { Router } from "express";
import {
  gifUpload,
  publicGifUrl,
  deleteGifFile,
} from "../config/upload.js";
import {
  deleteHero,
  getHeroById,
  listPersonalHeroes,
  serializeHero,
  updateHero,
} from "../models/Hero.js";
import { emitHeroMutation, emitHeroSaved } from "../services/heroEvents.js";
import { parseHeroConfig } from "../services/heroAppearance.js";
import type { HeroPatch } from "../types.js";

const router = Router();

type HeroBodyDefaults = {
  name?: string;
  width?: number;
  height?: number;
  activeWidth?: number;
  activeHeight?: number;
  bubbleColor?: string;
  fontSize?: number;
  fontColor?: string;
  bubbleDuration?: number;
};

function optionalInt(value: unknown, fallback: number): number {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function heroFieldsFromBody(
  body: Record<string, unknown> | undefined,
  defaults: HeroBodyDefaults = {},
): Omit<HeroPatch, "gifUrl"> & { name?: string } {
  return {
    name: body?.name != null ? String(body.name).trim() : defaults.name,
    width: optionalInt(body?.width, defaults.width ?? 160),
    height: optionalInt(body?.height, defaults.height ?? 220),
    activeWidth: optionalInt(body?.activeWidth, defaults.activeWidth ?? 180),
    activeHeight: optionalInt(body?.activeHeight, defaults.activeHeight ?? 240),
    bubbleColor:
      (typeof body?.bubbleColor === "string" && body.bubbleColor) ||
      defaults.bubbleColor ||
      "#ffffff",
    fontSize: optionalInt(body?.fontSize, defaults.fontSize ?? 16),
    fontColor:
      (typeof body?.fontColor === "string" && body.fontColor) ||
      defaults.fontColor ||
      "#000000",
    bubbleDuration: optionalInt(
      body?.bubbleDuration,
      defaults.bubbleDuration ?? 5000,
    ),
    config:
      body?.config != null
        ? parseHeroConfig(body.config, String(body?.name || defaults.name || "Герой"))
        : undefined,
  };
}

router.get("/", (_req, res) => {
  res.json({ success: true, heroes: listPersonalHeroes().map(serializeHero) });
});

router.get("/:id", (req, res) => {
  const hero = getHeroById(Number(req.params.id));
  if (!hero || hero.user_id == null) {
    res.status(404).json({ success: false, error: "Hero not found" });
    return;
  }
  res.json({ success: true, hero: serializeHero(hero) });
});

router.post("/", (_req, res) => {
  res.status(400).json({
    success: false,
    error: "Personal heroes are created automatically for each user",
  });
});

function applyHeroUpdate(
  current: NonNullable<ReturnType<typeof getHeroById>>,
  body: Record<string, unknown>,
  gifUrl?: string,
) {
  const fields = heroFieldsFromBody(body, {
    name: current.name,
    width: current.width,
    height: current.height,
    activeWidth: current.active_width,
    activeHeight: current.active_height,
    bubbleColor: current.bubble_color,
    fontSize: current.font_size,
    fontColor: current.font_color,
    bubbleDuration: current.bubble_duration,
  });
  const hero = updateHero(current.id, { ...fields, gifUrl, userId: current.user_id });
  return { hero };
}

router.put("/:id", (req, res, next) => {
  const isMultipart = String(req.headers["content-type"] || "").includes("multipart/form-data");
  if (isMultipart) {
    gifUpload.single("gif")(req, res, next);
    return;
  }
  next();
}, (req, res) => {
  const current = getHeroById(Number(req.params.id));
  if (!current || current.user_id == null) {
    if (req.file) deleteGifFile(publicGifUrl(req.file.filename));
    res.status(404).json({ success: false, error: "Hero not found" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  let gifUrl: string | undefined;
  if (req.file) {
    gifUrl = publicGifUrl(req.file.filename);
    if (current.gif_url) deleteGifFile(current.gif_url);
  }

  const result = applyHeroUpdate(current, body, gifUrl);
  if (!result.hero) {
    if (req.file) deleteGifFile(publicGifUrl(req.file.filename));
    res.status(400).json({ success: false, error: "Failed to update hero" });
    return;
  }

  res.json({ success: true, hero: emitHeroSaved(result.hero) });
});

router.delete("/:id", (req, res) => {
  const current = getHeroById(Number(req.params.id));
  if (!current) {
    res.status(404).json({ success: false, error: "Hero not found" });
    return;
  }
  const hero = deleteHero(current.id);
  if (!hero) {
    res.status(404).json({ success: false, error: "Hero not found" });
    return;
  }
  if (hero.gif_url) deleteGifFile(hero.gif_url);
  emitHeroMutation("hero_deleted", { heroId: hero.id });
  res.json({ success: true, message: "Hero deleted successfully" });
});

export default router;
