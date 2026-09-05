import { defaultHeroConfig, type Hero } from "@/types/hero";
import type { TestChatter } from "@/types/overlay";

export const TEST_CHATTER_1_ID = -1;
export const TEST_CHATTER_2_ID = -2;

function testHero(id: number, name: string, look: Partial<NonNullable<Hero["config"]>>): Hero {
  const config = { ...defaultHeroConfig(name), ...look, name };
  return {
    id,
    name,
    gifUrl: "",
    width: 160,
    height: 220,
    activeWidth: 180,
    activeHeight: 240,
    bubbleColor: "#ffffff",
    fontSize: 16,
    fontColor: "#111111",
    bubbleDuration: 5000,
    userId: null,
    username: name,
    config,
    status: "patrol",
  };
}

export const TEST_HERO_1 = testHero(TEST_CHATTER_1_ID, "Пользователь 1", {
  shirtColor: "#9146FF",
  pantsColor: "#2c3e50",
  hair: "short",
  hairColor: "#3b2f2f",
  skin: "#f4c7a1",
});

export const TEST_HERO_2 = testHero(TEST_CHATTER_2_ID, "Пользователь 2", {
  shirtColor: "#e74c3c",
  pantsColor: "#1a1a2e",
  hair: "long",
  hairColor: "#6b4423",
  glasses: "round",
  skin: "#d4a574",
});

export function createTestChatters(): TestChatter[] {
  return [
    {
      id: TEST_CHATTER_1_ID,
      username: TEST_HERO_1.name,
      hero: TEST_HERO_1,
      text: "Привет от Пользователя 1",
      duration: 5000,
    },
    {
      id: TEST_CHATTER_2_ID,
      username: TEST_HERO_2.name,
      hero: TEST_HERO_2,
      text: "Привет от Пользователя 2",
      duration: 8000,
    },
  ];
}
