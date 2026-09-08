import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import DatabaseConstructor from "better-sqlite3";
import { defaultHeroConfig, stringifyHeroConfig } from "../services/heroAppearance.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultPath = path.join(__dirname, "../../data/database.sqlite");

type SqliteDatabase = InstanceType<typeof DatabaseConstructor>;

let db: SqliteDatabase | undefined;

function tableColumns(database: SqliteDatabase, table: string): Set<string> {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((row) => row.name));
}

function addColumnIfMissing(
  database: SqliteDatabase,
  table: string,
  column: string,
  definition: string,
): void {
  if (!tableColumns(database, table).has(column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrate(database: SqliteDatabase): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS heroes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gif_url TEXT NOT NULL DEFAULT '',
      width INTEGER DEFAULT 200,
      height INTEGER DEFAULT 200,
      active_width INTEGER DEFAULT 300,
      active_height INTEGER DEFAULT 300,
      bubble_color TEXT DEFAULT '#ffffff',
      font_size INTEGER DEFAULT 18,
      font_color TEXT DEFAULT '#000000',
      bubble_duration INTEGER DEFAULT 5000,
      user_id INTEGER UNIQUE,
      config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS chatters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      twitch_id TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT,
      profile_image_url TEXT,
      hero_id INTEGER,
      assigned_at DATETIME,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      lying_until DATETIME,
      in_duel INTEGER DEFAULT 0,
      FOREIGN KEY (hero_id) REFERENCES heroes(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chatter_id INTEGER,
      hero_id INTEGER,
      message TEXT NOT NULL,
      is_command BOOLEAN,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chatter_id) REFERENCES chatters(id),
      FOREIGN KEY (hero_id) REFERENCES heroes(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS chatter_heroes_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chatter_id INTEGER,
      hero_id INTEGER,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chatter_id) REFERENCES chatters(id),
      FOREIGN KEY (hero_id) REFERENCES heroes(id)
    );

    CREATE TABLE IF NOT EXISTS duels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenger_id INTEGER,
      opponent_id INTEGER,
      winner_id INTEGER,
      loser_id INTEGER,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      FOREIGN KEY (challenger_id) REFERENCES chatters(id),
      FOREIGN KEY (opponent_id) REFERENCES chatters(id),
      FOREIGN KEY (winner_id) REFERENCES chatters(id),
      FOREIGN KEY (loser_id) REFERENCES chatters(id)
    );
  `);

  addColumnIfMissing(database, "heroes", "user_id", "INTEGER");
  addColumnIfMissing(database, "heroes", "config", "TEXT");
  try {
    database.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_heroes_user_id ON heroes (user_id) WHERE user_id IS NOT NULL",
    );
  } catch (error) {
    console.warn("Hero user_id unique index skipped:", error);
  }
  addColumnIfMissing(database, "chatters", "wins", "INTEGER DEFAULT 0");
  addColumnIfMissing(database, "chatters", "losses", "INTEGER DEFAULT 0");
  addColumnIfMissing(database, "chatters", "lying_until", "DATETIME");
  addColumnIfMissing(database, "chatters", "in_duel", "INTEGER DEFAULT 0");
  try {
    database.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_chatters_username_lower ON chatters (lower(username))",
    );
  } catch (error) {
    console.warn("Username unique index skipped:", error);
  }

  const withoutConfig = database
    .prepare("SELECT id, name FROM heroes WHERE config IS NULL OR config = ''")
    .all() as { id: number; name: string }[];
  const fill = database.prepare("UPDATE heroes SET config = ? WHERE id = ?");
  for (const row of withoutConfig) {
    fill.run(stringifyHeroConfig(defaultHeroConfig(row.name)), row.id);
  }
}

export function getDb(): SqliteDatabase {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : defaultPath;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new DatabaseConstructor(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}
