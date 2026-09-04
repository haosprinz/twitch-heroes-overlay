import { Router } from "express";
import { deleteChatter, listChatters, getChatterWithHero } from "../models/Chatter.js";
import { emitHeroChange, emitToClients } from "../services/chatService.js";
import {
  assignHero,
  serializeChatter,
  unassignHero,
} from "../services/heroAssignment.js";
import type { ChatterWithHeroRow } from "../types.js";

const router = Router();

function mapListRow(row: ChatterWithHeroRow) {
  return {
    id: row.id,
    twitchId: row.twitch_id,
    username: row.username,
    displayName: row.display_name,
    profileImageUrl: row.profile_image_url,
    heroId: row.hero_id,
    hero: row.hero_id ? { id: row.hero_id, name: row.hero_name } : null,
    lastSeen: row.last_seen,
    messageCount: Number(row.message_count || 0),
  };
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

  res.json({
    success: true,
    chatters,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
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
