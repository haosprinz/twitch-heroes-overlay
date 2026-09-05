import { getDb } from "../config/database.js";
import { deleteDuelsForChatter } from "./Duel.js";
import type { ChatterRow, ChatterWithHeroRow, TwitchChatterInput } from "../types.js";

export function listChatters(): ChatterWithHeroRow[] {
  return getDb()
    .prepare(
      `SELECT c.*, COALESCE(c.display_name, c.username, h.name) AS hero_name,
              (SELECT COUNT(*) FROM messages m WHERE m.chatter_id = c.id) AS message_count
       FROM chatters c
       LEFT JOIN heroes h ON h.id = c.hero_id
       ORDER BY c.wins DESC, c.last_seen DESC`,
    )
    .all() as ChatterWithHeroRow[];
}

export function getChatterById(id: number): ChatterRow | undefined {
  return getDb().prepare("SELECT * FROM chatters WHERE id = ?").get(id) as
    | ChatterRow
    | undefined;
}

export function getChatterByTwitchId(twitchId: string): ChatterRow | undefined {
  return getDb()
    .prepare("SELECT * FROM chatters WHERE twitch_id = ?")
    .get(twitchId) as ChatterRow | undefined;
}

export function getChatterByUsername(username: string): ChatterRow | undefined {
  return getDb()
    .prepare("SELECT * FROM chatters WHERE lower(username) = lower(?)")
    .get(username) as ChatterRow | undefined;
}

export function upsertChatterFromTwitch({
  twitchId,
  username,
  displayName,
  profileImageUrl,
}: TwitchChatterInput): ChatterRow {
  const db = getDb();
  const normalized = String(username || "").trim().toLowerCase();
  db.prepare(
    `INSERT INTO chatters (twitch_id, username, display_name, profile_image_url, last_seen)
     VALUES (@twitchId, @username, @displayName, @profileImageUrl, CURRENT_TIMESTAMP)
     ON CONFLICT(twitch_id) DO UPDATE SET
       username = excluded.username,
       display_name = excluded.display_name,
       profile_image_url = COALESCE(excluded.profile_image_url, chatters.profile_image_url),
       last_seen = CURRENT_TIMESTAMP`,
  ).run({
    twitchId,
    username: normalized,
    displayName: displayName || username,
    profileImageUrl: profileImageUrl || null,
  });
  const chatter = getChatterByTwitchId(twitchId);
  if (!chatter) {
    throw new Error("Failed to load upserted chatter");
  }
  return chatter;
}

export function getChatterWithHero(id: number): ChatterWithHeroRow | undefined {
  return getDb()
    .prepare(
      `SELECT c.*, COALESCE(c.display_name, c.username, h.name) AS hero_name,
              (SELECT COUNT(*) FROM messages m WHERE m.chatter_id = c.id) AS message_count
       FROM chatters c
       LEFT JOIN heroes h ON h.id = c.hero_id
       WHERE c.id = ?`,
    )
    .get(id) as ChatterWithHeroRow | undefined;
}

export function assignHeroToChatter(
  chatterId: number,
  heroId: number,
): ChatterWithHeroRow {
  const db = getDb();
  db.prepare(
    `UPDATE chatters
     SET hero_id = ?, assigned_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(heroId, chatterId);
  db.prepare(
    `INSERT INTO chatter_heroes_history (chatter_id, hero_id)
     VALUES (?, ?)`,
  ).run(chatterId, heroId);
  const chatter = getChatterWithHero(chatterId);
  if (!chatter) {
    throw new Error("Failed to load chatter after hero assignment");
  }
  return chatter;
}

export function clearHeroFromChatter(chatterId: number): ChatterWithHeroRow {
  getDb()
    .prepare(
      `UPDATE chatters
       SET hero_id = NULL, assigned_at = NULL
       WHERE id = ?`,
    )
    .run(chatterId);
  const chatter = getChatterWithHero(chatterId);
  if (!chatter) {
    throw new Error("Failed to load chatter after hero unassignment");
  }
  return chatter;
}

export function setChatterDuelFlags(
  chatterId: number,
  flags: { inDuel?: boolean; lyingUntil?: string | null },
): void {
  const current = getChatterById(chatterId);
  if (!current) return;
  getDb()
    .prepare(
      `UPDATE chatters
       SET in_duel = @inDuel, lying_until = @lyingUntil
       WHERE id = @id`,
    )
    .run({
      id: chatterId,
      inDuel: flags.inDuel === undefined ? current.in_duel : flags.inDuel ? 1 : 0,
      lyingUntil:
        flags.lyingUntil === undefined ? current.lying_until : flags.lyingUntil,
    });
}

export function applyDuelRecord(winnerId: number, loserId: number, lyingUntil: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE chatters
     SET wins = wins + 1, in_duel = 0, last_seen = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(winnerId);
  db.prepare(
    `UPDATE chatters
     SET losses = losses + 1, in_duel = 0, lying_until = ?, last_seen = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(lyingUntil, loserId);
}

export function clearAllInDuel(): void {
  getDb().prepare("UPDATE chatters SET in_duel = 0").run();
}

export function listKnockedOut(): ChatterRow[] {
  const rows = getDb()
    .prepare(`SELECT * FROM chatters WHERE lying_until IS NOT NULL`)
    .all() as ChatterRow[];
  return rows.filter((row) => new Date(row.lying_until as string).getTime() > Date.now());
}

export function clearExpiredKnockouts(): void {
  const rows = getDb()
    .prepare(`SELECT id, lying_until FROM chatters WHERE lying_until IS NOT NULL`)
    .all() as { id: number; lying_until: string }[];
  const update = getDb().prepare(`UPDATE chatters SET lying_until = NULL WHERE id = ?`);
  for (const row of rows) {
    const until = new Date(row.lying_until).getTime();
    if (!Number.isFinite(until) || until <= Date.now()) {
      update.run(row.id);
    }
  }
}

export function countActiveChattersToday(): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS total FROM chatters WHERE date(last_seen) = date('now')`,
    )
    .get() as { total: number };
  return row.total;
}

export function deleteChatter(id: number): ChatterRow | undefined {
  const chatter = getChatterById(id);
  if (!chatter) return undefined;
  const db = getDb();
  const tx = db.transaction(() => {
    deleteDuelsForChatter(id);
    db.prepare("DELETE FROM messages WHERE chatter_id = ?").run(id);
    db.prepare("DELETE FROM chatter_heroes_history WHERE chatter_id = ?").run(id);
    db.prepare("UPDATE heroes SET user_id = NULL WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM chatters WHERE id = ?").run(id);
  });
  tx();
  return chatter;
}
