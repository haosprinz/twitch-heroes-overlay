import { getDb } from "../config/database.js";
import {
  defaultHeroConfig,
  parseHeroConfig,
  stringifyHeroConfig,
  type HeroConfig,
} from "../services/heroAppearance.js";
import type {
  HeroPatch,
  HeroRow,
  HeroStatus,
  HeroWrite,
  PopularHeroRow,
  SerializedHero,
} from "../types.js";

function chatterStatus(row?: {
  in_duel?: number | null;
  lying_until?: string | null;
}): HeroStatus {
  if (row?.in_duel) return "duel";
  if (row?.lying_until && new Date(row.lying_until).getTime() > Date.now()) {
    return "lying";
  }
  return "patrol";
}

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

export function getHeroByUserId(userId: number): HeroRow | undefined {
  return getDb()
    .prepare("SELECT * FROM heroes WHERE user_id = ?")
    .get(userId) as HeroRow | undefined;
}

export function pickRandomHero(): HeroRow | null {
  const heroes = listHeroes();
  if (!heroes.length) return null;
  return heroes[Math.floor(Math.random() * heroes.length)] ?? null;
}

export function heroConfigOf(row: HeroRow | null | undefined): HeroConfig {
  return parseHeroConfig(row?.config, row?.name || "Герой");
}

export function serializeHero(row: HeroRow | null | undefined): SerializedHero | null {
  if (!row) return null;
  const owner = row.user_id
    ? (getDb()
        .prepare("SELECT username, display_name, in_duel, lying_until FROM chatters WHERE id = ?")
        .get(row.user_id) as
        | {
            username: string;
            display_name: string | null;
            in_duel: number;
            lying_until: string | null;
          }
        | undefined)
    : undefined;
  const ownerName = owner?.display_name || owner?.username || null;
  const config = heroConfigOf(row);
  if (ownerName) config.name = ownerName;
  return {
    id: row.id,
    name: ownerName || row.name,
    gifUrl: row.gif_url,
    width: row.width,
    height: row.height,
    activeWidth: row.active_width,
    activeHeight: row.active_height,
    bubbleColor: row.bubble_color,
    fontSize: row.font_size,
    fontColor: row.font_color,
    bubbleDuration: row.bubble_duration,
    userId: row.user_id,
    username: owner?.username ?? null,
    config,
    status: chatterStatus(owner),
    lyingUntil: owner?.lying_until ?? null,
  };
}

export function createHero(data: HeroWrite): HeroRow {
  const config = data.config
    ? parseHeroConfig(data.config, data.name)
    : defaultHeroConfig(data.name);
  const result = getDb()
    .prepare(
      `INSERT INTO heroes (
        name, gif_url, width, height, active_width, active_height,
        bubble_color, font_size, font_color, bubble_duration, user_id, config, updated_at
      ) VALUES (
        @name, @gifUrl, @width, @height, @activeWidth, @activeHeight,
        @bubbleColor, @fontSize, @fontColor, @bubbleDuration, @userId, @config, CURRENT_TIMESTAMP
      )`,
    )
    .run({
      name: data.name,
      gifUrl: data.gifUrl ?? "",
      width: data.width,
      height: data.height,
      activeWidth: data.activeWidth,
      activeHeight: data.activeHeight,
      bubbleColor: data.bubbleColor,
      fontSize: data.fontSize,
      fontColor: data.fontColor,
      bubbleDuration: data.bubbleDuration,
      userId: data.userId ?? null,
      config: stringifyHeroConfig(config),
    });
  const hero = getHeroById(Number(result.lastInsertRowid));
  if (!hero) {
    throw new Error("Failed to load created hero");
  }
  return hero;
}

function ownerNickname(userId: number | null): string | null {
  if (!userId) return null;
  const owner = getDb()
    .prepare("SELECT username, display_name FROM chatters WHERE id = ?")
    .get(userId) as { username: string; display_name: string | null } | undefined;
  return owner?.display_name || owner?.username || null;
}

export function updateHero(id: number, data: HeroPatch): HeroRow | undefined {
  const current = getHeroById(id);
  if (!current) return undefined;
  const boundName = ownerNickname(current.user_id) || data.name || current.name;
  const nextConfig = data.config
    ? parseHeroConfig(data.config, boundName)
    : heroConfigOf(current);
  nextConfig.name = boundName;
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
        user_id = @userId,
        config = @config,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`,
    )
    .run({
      id,
      name: boundName,
      gifUrl: data.gifUrl ?? current.gif_url,
      width: data.width ?? current.width,
      height: data.height ?? current.height,
      activeWidth: data.activeWidth ?? current.active_width,
      activeHeight: data.activeHeight ?? current.active_height,
      bubbleColor: data.bubbleColor ?? current.bubble_color,
      fontSize: data.fontSize ?? current.font_size,
      fontColor: data.fontColor ?? current.font_color,
      bubbleDuration: data.bubbleDuration ?? current.bubble_duration,
      userId: data.userId === undefined ? current.user_id : data.userId,
      config: stringifyHeroConfig(nextConfig),
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
