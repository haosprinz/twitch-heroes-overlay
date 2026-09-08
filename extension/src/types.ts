export type HairStyle = "short" | "long" | "spiky" | "bald" | "ponytail";
export type HatStyle = "none" | "cap" | "beanie" | "crown";
export type GlassesStyle = "none" | "round" | "square";

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

export type Hero = {
  id: number;
  name: string;
  username?: string | null;
  config?: HeroConfig;
  bubbleColor?: string;
  fontColor?: string;
  fontSize?: number;
  bubbleDuration?: number;
};

export function defaultHeroConfig(name = "Герой"): HeroConfig {
  return {
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
  };
}
