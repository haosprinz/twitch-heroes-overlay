import { requestDuel, statsReply } from "./duelService.js";
import type { ChatterRow, CommandResult } from "../types.js";

export function parseCommand(
  text: string,
): { name: string; argument: string } | null {
  const match = String(text || "")
    .trim()
    .match(/^\\(\S+)(?:\s+(.*))?$/);
  if (!match) return null;
  return {
    name: (match[1] ?? "").toLowerCase(),
    argument: (match[2] || "").trim(),
  };
}

export function isCommandText(text: string): boolean {
  return parseCommand(text) !== null;
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

  if (parsed.name === "duel") {
    return requestDuel(chatter, parsed.argument);
  }

  if (parsed.name === "stats") {
    return statsReply(chatter);
  }

  if (parsed.name === "help") {
    return {
      handled: true,
      type: "info",
      reply:
        "📖 Доступные команды:\n• \\duel ник - вызвать на дуэль\n• \\stats - ваши победы и поражения\n• \\help - показать эту справку",
    };
  }

  return { handled: false };
}
