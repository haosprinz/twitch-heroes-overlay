import { Router } from "express";
import {
  gifUpload,
  publicGifUrl,
  deleteGifFile,
} from "../config/upload.js";
import {
  createHero,
  deleteHero,
  getHeroById,
  listHeroes,
  serializeHero,
  updateHero,
} from "../models/Hero.js";
import { emitToClients } from "../services/chatService.js";
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
    width: optionalInt(body?.width, defaults.width ?? 200),
    height: optionalInt(body?.height, defaults.height ?? 200),
    activeWidth: optionalInt(body?.activeWidth, defaults.activeWidth ?? 300),
    activeHeight: optionalInt(body?.activeHeight, defaults.activeHeight ?? 300),
    bubbleColor:
      (typeof body?.bubbleColor === "string" && body.bubbleColor) ||
      defaults.bubbleColor ||
      "#ffffff",
    fontSize: optionalInt(body?.fontSize, defaults.fontSize ?? 18),
    fontColor:
      (typeof body?.fontColor === "string" && body.fontColor) ||
      defaults.fontColor ||
      "#000000",
    bubbleDuration: optionalInt(
      body?.bubbleDuration,
      defaults.bubbleDuration ?? 5000,
    ),
  };
}

function emitHeroEvent(event: string, payload: Record<string, unknown>): void {
  emitToClients(event, { ...payload, timestamp: Date.now() });
}

router.get("/", (_req, res) => {
  res.json({ success: true, heroes: listHeroes().map(serializeHero) });
});

router.get("/:id", (req, res) => {
  const hero = getHeroById(Number(req.params.id));
  if (!hero) {
    res.status(404).json({ success: false, error: "Hero not found" });
    return;
  }
  res.json({ success: true, hero: serializeHero(hero) });
});

router.post("/", gifUpload.single("gif"), (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  if (!name) {
    if (req.file) deleteGifFile(publicGifUrl(req.file.filename));
    res.status(400).json({ success: false, error: "name is required" });
    return;
  }
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: "Invalid file type. Only GIF files are allowed.",
    });
    return;
  }

  const fields = heroFieldsFromBody(body);
  const hero = createHero({
    name,
    gifUrl: publicGifUrl(req.file.filename),
    width: fields.width ?? 200,
    height: fields.height ?? 200,
    activeWidth: fields.activeWidth ?? 300,
    activeHeight: fields.activeHeight ?? 300,
    bubbleColor: fields.bubbleColor ?? "#ffffff",
    fontSize: fields.fontSize ?? 18,
    fontColor: fields.fontColor ?? "#000000",
    bubbleDuration: fields.bubbleDuration ?? 5000,
  });
  const mapped = serializeHero(hero);
  emitHeroEvent("hero_created", { hero: mapped });
  res.status(201).json({ success: true, hero: mapped });
});

router.put("/:id", gifUpload.single("gif"), (req, res) => {
  const current = getHeroById(Number(req.params.id));
  if (!current) {
    if (req.file) deleteGifFile(publicGifUrl(req.file.filename));
    res.status(404).json({ success: false, error: "Hero not found" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
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

  if (!fields.name) {
    if (req.file) deleteGifFile(publicGifUrl(req.file.filename));
    res.status(400).json({ success: false, error: "name is required" });
    return;
  }

  let gifUrl: string | undefined;
  if (req.file) {
    gifUrl = publicGifUrl(req.file.filename);
    deleteGifFile(current.gif_url);
  }

  const hero = updateHero(current.id, { ...fields, gifUrl });
  const mapped = serializeHero(hero);
  emitHeroEvent("hero_updated", { hero: mapped });
  res.json({ success: true, hero: mapped });
});

router.delete("/:id", (req, res) => {
  const hero = deleteHero(Number(req.params.id));
  if (!hero) {
    res.status(404).json({ success: false, error: "Hero not found" });
    return;
  }
  deleteGifFile(hero.gif_url);
  emitHeroEvent("hero_deleted", { heroId: hero.id });
  res.json({ success: true, message: "Hero deleted successfully" });
});

export default router;
