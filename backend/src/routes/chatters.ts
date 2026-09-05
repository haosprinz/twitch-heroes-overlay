import { Router } from "express";
import { deleteChatter, getChatterById, listChatters, getChatterWithHero } from "../models/Chatter.js";
import { emitHeroChange } from "../services/chatService.js";
import { emitToClients } from "../services/realtime.js";
import { ensurePersonalHero } from "../services/heroFactory.js";
import { serializeHero } from "../models/Hero.js";
import {
  assignHero,
  serializeChatter,
  unassignHero,
} from "../services/heroAssignment.js";
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
    emitToClients("hero_created", {
      hero: serializeHero(result.hero),
      timestamp: Date.now(),
    });
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
  const heroId = Number(req.body?.heroId);
  if (!Number.isInteger(heroId) || heroId < 1) {
    res.status(400).json({ success: false, error: "heroId is required" });
    return;
  }

  const result = assignHero(Number(req.params.id), heroId);
  if (!result.ok) {
    const status =
      result.error === "Chatter not found" || result.error === "Hero not found"
        ? 404
        : 400;
    res.status(status).json({ success: false, error: result.error });
    return;
  }

  emitHeroChange(result.chatter, result.hero);
  res.json({
    success: true,
    chatter: { id: result.chatter.id, heroId: result.chatter.hero_id },
  });
});

router.delete("/:id/hero", (req, res) => {
  const result = unassignHero(Number(req.params.id));
  if (!result.ok) {
    res.status(404).json({ success: false, error: result.error });
    return;
  }

  emitToClients("chatter_updated", {
    chatterId: result.chatter.id,
    chatter: serializeChatter(result.chatter),
    timestamp: Date.now(),
  });
  res.json({
    success: true,
    chatter: { id: result.chatter.id, heroId: null },
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
