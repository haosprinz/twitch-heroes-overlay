import { getDb } from "../config/database.js";
import type {
  HeroPatch,
  HeroRow,
  HeroWrite,
  PopularHeroRow,
  SerializedHero,
} from "../types.js";

export function listHeroes(): HeroRow[] {
  return getDb().prepare("SELECT * FROM heroes ORDER BY id ASC").all() as HeroRow[];
}

export function getHeroById(id: number): HeroRow | undefined {
  return getDb().prepare("SELECT * FROM heroes WHERE id = ?").get(id) as
    | HeroRow
    | undefined;
}

export function getHeroByName(name: string): HeroRow | undefined {
  return getDb()
    .prepare("SELECT * FROM heroes WHERE lower(name) = lower(?)")
    .get(name) as HeroRow | undefined;
}

export function pickRandomHero(): HeroRow | null {
  const heroes = listHeroes();
  if (!heroes.length) return null;
  return heroes[Math.floor(Math.random() * heroes.length)] ?? null;
}

export function serializeHero(row: HeroRow | null | undefined): SerializedHero | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    gifUrl: row.gif_url,
    width: row.width,
    height: row.height,
    activeWidth: row.active_width,
    activeHeight: row.active_height,
    bubbleColor: row.bubble_color,
    fontSize: row.font_size,
    fontColor: row.font_color,
    bubbleDuration: row.bubble_duration,
  };
}

export function createHero(data: HeroWrite): HeroRow {
  const result = getDb()
    .prepare(
      `INSERT INTO heroes (
        name, gif_url, width, height, active_width, active_height,
        bubble_color, font_size, font_color, bubble_duration, updated_at
      ) VALUES (
        @name, @gifUrl, @width, @height, @activeWidth, @activeHeight,
        @bubbleColor, @fontSize, @fontColor, @bubbleDuration, CURRENT_TIMESTAMP
      )`,
    )
    .run(data);
  const hero = getHeroById(Number(result.lastInsertRowid));
  if (!hero) {
    throw new Error("Failed to load created hero");
  }
  return hero;
}

export function updateHero(id: number, data: HeroPatch): HeroRow | undefined {
  const current = getHeroById(id);
  if (!current) return undefined;
  getDb()
    .prepare(
      `UPDATE heroes SET
        name = @name,
        gif_url = @gifUrl,
        width = @width,
        height = @height,
        active_width = @activeWidth,
        active_height = @activeHeight,
        bubble_color = @bubbleColor,
        font_size = @fontSize,
        font_color = @fontColor,
        bubble_duration = @bubbleDuration,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`,
    )
    .run({
      id,
      name: data.name ?? current.name,
      gifUrl: data.gifUrl ?? current.gif_url,
      width: data.width ?? current.width,
      height: data.height ?? current.height,
      activeWidth: data.activeWidth ?? current.active_width,
      activeHeight: data.activeHeight ?? current.active_height,
      bubbleColor: data.bubbleColor ?? current.bubble_color,
      fontSize: data.fontSize ?? current.font_size,
      fontColor: data.fontColor ?? current.font_color,
      bubbleDuration: data.bubbleDuration ?? current.bubble_duration,
    });
  return getHeroById(id);
}

export function deleteHero(id: number): HeroRow | undefined {
  const db = getDb();
  const hero = getHeroById(id);
  if (!hero) return undefined;
  const tx = db.transaction(() => {
    db.prepare("UPDATE chatters SET hero_id = NULL, assigned_at = NULL WHERE hero_id = ?").run(id);
    db.prepare("UPDATE messages SET hero_id = NULL WHERE hero_id = ?").run(id);
    db.prepare("DELETE FROM chatter_heroes_history WHERE hero_id = ?").run(id);
    db.prepare("DELETE FROM heroes WHERE id = ?").run(id);
  });
  tx();
  return hero;
}

export function getMostPopularHero(): PopularHeroRow | undefined {
  return getDb()
    .prepare(
      `SELECT h.id, h.name, COUNT(c.id) AS chatterCount
       FROM heroes h
       LEFT JOIN chatters c ON c.hero_id = h.id
       GROUP BY h.id
       ORDER BY chatterCount DESC, h.id ASC
       LIMIT 1`,
    )
    .get() as PopularHeroRow | undefined;
}
