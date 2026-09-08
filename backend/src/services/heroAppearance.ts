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

const HAIR: HairStyle[] = ["short", "long", "spiky", "bald", "ponytail"];
const HATS: HatStyle[] = ["none", "none", "none", "cap", "beanie", "crown"];
const GLASSES: GlassesStyle[] = ["none", "none", "none", "round", "square"];
const SKINS = ["#f4c7a1", "#e8b48a", "#d4a574", "#c68642", "#8d5524", "#ffdbac"];
const HAIR_COLORS = ["#1b1b1b", "#3b2f2f", "#6b4423", "#c9a227", "#d4572a", "#4a90d9", "#eeeeee"];
const SHIRTS = ["#9146FF", "#00AEFF", "#e74c3c", "#2ecc71", "#f1c40f", "#34495e", "#e67e22"];
const PANTS = ["#2c3e50", "#1a1a2e", "#4b3621", "#3d3d3d", "#5d4e37"];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

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

export function randomHeroConfig(name = "Герой"): HeroConfig {
  return {
    name,
    skin: pick(SKINS),
    hair: pick(HAIR),
    hairColor: pick(HAIR_COLORS),
    hat: pick(HATS),
    glasses: pick(GLASSES),
    shirtColor: pick(SHIRTS),
    pantsColor: pick(PANTS),
    size: 1,
    speed: Number((0.7 + Math.random() * 0.8).toFixed(2)),
  };
}

export function parseHeroConfig(raw: unknown, fallbackName = "Герой"): HeroConfig {
  const base = defaultHeroConfig(fallbackName);
  let data: Record<string, unknown> = {};
  if (typeof raw === "string" && raw.trim()) {
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return base;
    }
  } else if (raw && typeof raw === "object") {
    data = raw as Record<string, unknown>;
  } else {
    return base;
  }

  const hair = String(data.hair || base.hair) as HairStyle;
  const hat = String(data.hat || base.hat) as HatStyle;
  const glasses = String(data.glasses || base.glasses) as GlassesStyle;

  return {
    name: String(data.name || fallbackName),
    skin: String(data.skin || base.skin),
    hair: HAIR.includes(hair) ? hair : base.hair,
    hairColor: String(data.hairColor || base.hairColor),
    hat: HATS.includes(hat) ? hat : base.hat,
    glasses: GLASSES.includes(glasses) ? glasses : base.glasses,
    shirtColor: String(data.shirtColor || base.shirtColor),
    pantsColor: String(data.pantsColor || base.pantsColor),
    size: 1,
    speed: clamp(Number(data.speed ?? base.speed), 0.4, 2.2),
  };
}

export function stringifyHeroConfig(config: HeroConfig): string {
  return JSON.stringify(config);
}
