import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import DatabaseConstructor from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultPath = path.join(__dirname, "../../data/database.sqlite");

type SqliteDatabase = InstanceType<typeof DatabaseConstructor>;

let db: SqliteDatabase | undefined;

function migrate(database: SqliteDatabase): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS heroes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gif_url TEXT NOT NULL,
      width INTEGER DEFAULT 200,
      height INTEGER DEFAULT 200,
      active_width INTEGER DEFAULT 300,
      active_height INTEGER DEFAULT 300,
      bubble_color TEXT DEFAULT '#ffffff',
      font_size INTEGER DEFAULT 18,
      font_color TEXT DEFAULT '#000000',
      bubble_duration INTEGER DEFAULT 5000,
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
  `);
}

function seedHeroes(database: SqliteDatabase): void {
  const count = database.prepare("SELECT COUNT(*) AS total FROM heroes").get() as {
    total: number;
  };
  if (count.total > 0) return;
  const insert = database.prepare(
    `INSERT INTO heroes (name, gif_url, bubble_color, font_color)
     VALUES (?, ?, ?, ?)`,
  );
  insert.run("odin", "/uploads/gifs/odin.gif", "#9146FF", "#ffffff");
  insert.run("thor", "/uploads/gifs/thor.gif", "#00AEFF", "#ffffff");
  insert.run("loki", "/uploads/gifs/loki.gif", "#00ff00", "#000000");
  console.log("Seeded placeholder heroes: odin, thor, loki");
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
  seedHeroes(db);
  return db;
}
