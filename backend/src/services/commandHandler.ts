import { listHeroes } from "../models/Hero.js";
import { assignHeroByName, getAssignedChatter } from "./heroAssignment.js";
import type { ChatterRow, CommandResult } from "../types.js";

function parseCommand(text: string): { name: string; argument: string } | null {
  const match = String(text || "")
    .trim()
    .match(/^\/(\S+)(?:\s+(.*))?$/);
  if (!match) return null;
  return {
    name: (match[1] ?? "").toLowerCase(),
    argument: (match[2] || "").trim(),
  };
}

function listHeroNames(): string {
  const names = listHeroes().map((hero) => hero.name);
  if (!names.length) {
    return "📜 Доступные герои: пока нет. Добавьте героев в админке.";
  }
  return `📜 Доступные герои: ${names.join(", ")}`;
}

export function handleCommand({
  chatter,
  text,
}: {
  chatter: ChatterRow;
  text: string;
}): CommandResult {
  const parsed = parseCommand(text);
  if (!parsed) {
    return { handled: false };
  }

  if (parsed.name === "heroes") {
    if (!parsed.argument) {
      return { handled: true, type: "info", reply: listHeroNames() };
    }

    const result = assignHeroByName(chatter.id, parsed.argument);
    if (!result.ok) {
      return {
        handled: true,
        type: "error",
        reply: `❌ Герой "${parsed.argument}" не найден. Используйте /heroes для списка`,
      };
    }

    const username = chatter.display_name || chatter.username;
    return {
      handled: true,
      type: "success",
      reply: `✅ ${username} теперь играет за ${result.hero?.name}! 🎮`,
      chatter: result.chatter,
      hero: result.hero ?? undefined,
    };
  }

  if (parsed.name === "hero") {
    const current = getAssignedChatter(chatter.id);
    if (!current?.hero_id || !current.hero_name) {
      return {
        handled: true,
        type: "info",
        reply:
          "ℹ️ У вас нет героя. Напишите /heroes для списка доступных героев",
      };
    }
    return {
      handled: true,
      type: "info",
      reply: `🎮 Ваш герой: ${current.hero_name}`,
    };
  }

  if (parsed.name === "help") {
    return {
      handled: true,
      type: "info",
      reply:
        "📖 Доступные команды:\n• /heroes - показать список героев\n• /heroes имя - выбрать героя\n• /hero - показать вашего героя\n• /help - показать эту справку",
    };
  }

  return { handled: false };
}
