export type HairStyle = "short" | "long" | "spiky" | "bald" | "ponytail";
export type HatStyle = "none" | "cap" | "beanie" | "crown";
export type GlassesStyle = "none" | "round" | "square";
export type HeroStatus = "patrol" | "duel" | "lying";

export type HeroConfig = {
  name: string;
  skin: string;
  hair: HairStyle;
  hairColor: string;
  hat: HatStyle;
  glasses: GlassesStyle;
  shirtColor: string;
  pantsColor: string;
  size: number;
  speed: number;
};

export interface Hero {
  id: number;
  name: string;
  gifUrl: string;
  width: number;
  height: number;
  activeWidth: number;
  activeHeight: number;
  bubbleColor: string;
  fontSize: number;
  fontColor: string;
  bubbleDuration: number;
  userId?: number | null;
  username?: string | null;
  config?: HeroConfig;
  status?: HeroStatus;
  lyingUntil?: string | null;
}

export const defaultHeroConfig = (name = "Герой"): HeroConfig => ({
  name,
  skin: "#f4c7a1",
  hair: "short",
  hairColor: "#3b2f2f",
  hat: "none",
  glasses: "none",
  shirtColor: "#9146FF",
  pantsColor: "#2c3e50",
  size: 1,
  speed: 1,
});
