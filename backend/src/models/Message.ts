import { getDb } from "../config/database.js";
import type { MessageInsert, RecentMessageRow } from "../types.js";

export function countMessages(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS total FROM messages").get() as {
    total: number;
  };
  return row.total;
}

export function countMessagesToday(): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS total FROM messages WHERE date(sent_at) = date('now')`,
    )
    .get() as { total: number };
  return row.total;
}

export function insertMessage({
  chatterId,
  heroId,
  message,
  isCommand,
}: MessageInsert): number {
  const result = getDb()
    .prepare(
      `INSERT INTO messages (chatter_id, hero_id, message, is_command)
       VALUES (?, ?, ?, ?)`,
    )
    .run(chatterId, heroId ?? null, message, isCommand ? 1 : 0);
  return Number(result.lastInsertRowid);
}

export function listRecentMessages(limit = 20): RecentMessageRow[] {
  return getDb()
    .prepare(
      `SELECT m.id, m.message, m.is_command, m.sent_at,
              c.id AS chatter_id, c.twitch_id, c.username, c.display_name, c.hero_id
       FROM messages m
       JOIN chatters c ON c.id = m.chatter_id
       ORDER BY m.id DESC
       LIMIT ?`,
    )
    .all(limit) as RecentMessageRow[];
}
