import { getDb } from "../config/database.js";
import type { DuelRow } from "../types.js";

export function insertDuel(data: {
  challengerId: number;
  opponentId: number;
  winnerId: number;
  loserId: number;
}): DuelRow {
  const result = getDb()
    .prepare(
      `INSERT INTO duels (
        challenger_id, opponent_id, winner_id, loser_id, started_at, finished_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    )
    .run(data.challengerId, data.opponentId, data.winnerId, data.loserId);
  const row = getDb()
    .prepare("SELECT * FROM duels WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as DuelRow | undefined;
  if (!row) {
    throw new Error("Failed to load created duel");
  }
  return row;
}

export function listRecentDuels(limit = 12): DuelRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM duels
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(Math.max(1, limit)) as DuelRow[];
}

export function listDuelsBetween(a: number, b: number, limit = 8): DuelRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM duels
       WHERE (challenger_id = @a AND opponent_id = @b)
          OR (challenger_id = @b AND opponent_id = @a)
       ORDER BY id DESC
       LIMIT @limit`,
    )
    .all({ a, b, limit: Math.max(1, limit) }) as DuelRow[];
}

export function deleteDuelsForChatter(chatterId: number): void {
  getDb()
    .prepare(
      `DELETE FROM duels
       WHERE challenger_id = ? OR opponent_id = ? OR winner_id = ? OR loser_id = ?`,
    )
    .run(chatterId, chatterId, chatterId, chatterId);
}
