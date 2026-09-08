import { Router } from "express";
import { deleteChatter, getChatterById, listChatters, getChatterWithHero } from "../models/Chatter.js";
import { emitHeroChange } from "../services/chatService.js";
import { emitToClients } from "../services/realtime.js";
import {
  appearanceFromBody,
  ensurePersonalHero,
  resetPersonalHero,
  updatePersonalHero,
} from "../services/heroFactory.js";
import { serializeHero } from "../models/Hero.js";
import { serializeChatter } from "../services/heroAssignment.js";
import { emitHeroSaved } from "../services/heroEvents.js";
import { serializeChatterStatus } from "../services/overlayState.js";
import type { ChatterWithHeroRow } from "../types.js";

const router = Router();

function mapListRow(row: ChatterWithHeroRow) {
  return serializeChatterStatus(row);
}

router.get("/", (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Number(req.query.limit) || 50);
  const search = String(req.query.search || "").toLowerCase();

  let rows = listChatters();
  if (search) {
    rows = rows.filter(
      (row) =>
        row.username?.toLowerCase().includes(search) ||
        row.display_name?.toLowerCase().includes(search),
    );
  }

  const total = rows.length;
  const start = (page - 1) * limit;
  const chatters = rows.slice(start, start + limit).map(mapListRow);

  const payload = {
    success: true,
    chatters,
    users: chatters,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
  res.json(payload);
});

router.post("/:id/ensure-hero", (req, res) => {
  const chatter = getChatterById(Number(req.params.id));
  if (!chatter) {
    res.status(404).json({ success: false, error: "Chatter not found" });
    return;
  }
  const result = ensurePersonalHero(chatter);
  if (result.created) {
    emitHeroSaved(result.hero, true);
  }
  emitHeroChange(result.chatter, result.hero);
  res.json({
    success: true,
    chatter: serializeChatter(result.chatter),
    hero: serializeHero(result.hero),
  });
});

router.get("/:id", (req, res) => {
  const chatter = getChatterWithHero(Number(req.params.id));
  if (!chatter) {
    res.status(404).json({ success: false, error: "Chatter not found" });
    return;
  }
  res.json({
    success: true,
    chatter: serializeChatter(chatter),
  });
});

router.put("/:id/hero", (req, res) => {
  const chatter = getChatterById(Number(req.params.id));
  if (!chatter) {
    res.status(404).json({ success: false, error: "Chatter not found" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (body.heroId != null && body.config == null) {
    res.status(400).json({
      success: false,
      error: "Heroes are personal. Send config to change appearance.",
    });
    return;
  }

  const result = updatePersonalHero(
    chatter,
    appearanceFromBody(body, chatter.display_name || chatter.username),
  );
  const mapped = emitHeroSaved(result.hero, result.created);
  emitHeroChange(result.chatter, result.hero);
  res.json({
    success: true,
    chatter: serializeChatter(result.chatter),
    hero: mapped,
  });
});

router.delete("/:id/hero", (req, res) => {
  const chatter = getChatterById(Number(req.params.id));
  if (!chatter) {
    res.status(404).json({ success: false, error: "Chatter not found" });
    return;
  }

  const result = resetPersonalHero(chatter);
  emitHeroSaved(result.hero);
  emitHeroChange(result.chatter, result.hero);
  res.json({
    success: true,
    chatter: serializeChatter(result.chatter),
    hero: serializeHero(result.hero),
  });
});

router.delete("/:id", (req, res) => {
  const chatter = deleteChatter(Number(req.params.id));
  if (!chatter) {
    res.status(404).json({ success: false, error: "Chatter not found" });
    return;
  }

  emitToClients("chatter_deleted", {
    chatterId: chatter.id,
    timestamp: Date.now(),
  });
  res.json({
    success: true,
    chatter: { id: chatter.id },
  });
});

export default router;
