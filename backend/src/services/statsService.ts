import {
  countActiveChattersToday,
  listChatters,
} from "../models/Chatter.js";
import { listHeroes, getMostPopularHero } from "../models/Hero.js";
import { countMessages, countMessagesToday } from "../models/Message.js";
import type { StatsSnapshot } from "../types.js";

export function getStatsSnapshot(): StatsSnapshot {
  const chatters = listChatters();
  const heroes = listHeroes();
  const popular = getMostPopularHero();
  return {
    totalChatters: chatters.length,
    totalHeroes: heroes.length,
    totalMessages: countMessages(),
    messagesToday: countMessagesToday(),
    activeChattersToday: countActiveChattersToday(),
    mostPopularHero: popular
      ? {
          id: popular.id,
          name: popular.name,
          chatterCount: popular.chatterCount,
        }
      : null,
  };
}
