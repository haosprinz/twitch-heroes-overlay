import { getDb } from "../config/database.js";
import type { ChatterRow, ChatterWithHeroRow, TwitchChatterInput } from "../types.js";

export function listChatters(): ChatterWithHeroRow[] {
  return getDb()
    .prepare(
      `SELECT c.*, h.name AS hero_name,
              (SELECT COUNT(*) FROM messages m WHERE m.chatter_id = c.id) AS message_count
       FROM chatters c
       LEFT JOIN heroes h ON h.id = c.hero_id
       ORDER BY c.last_seen DESC`,
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

export function upsertChatterFromTwitch({
  twitchId,
  username,
  displayName,
  profileImageUrl,
}: TwitchChatterInput): ChatterRow {
  const db = getDb();
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
    username,
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
      `SELECT c.*, h.name AS hero_name,
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
    db.prepare("DELETE FROM messages WHERE chatter_id = ?").run(id);
    db.prepare("DELETE FROM chatter_heroes_history WHERE chatter_id = ?").run(id);
    db.prepare("DELETE FROM chatters WHERE id = ?").run(id);
  });
  tx();
  return chatter;
}
