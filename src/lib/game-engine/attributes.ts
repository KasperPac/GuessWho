import type { CharacterAttributes } from "@/types/game";

// ─── Attribute Value Lists ──────────────────────────────────────────────────

export const HAIR_LENGTHS: CharacterAttributes["hairLength"][] = [
  "bald",
  "buzz",
  "short",
  "medium",
  "long",
];

export const HAIR_COLORS: CharacterAttributes["hairColor"][] = [
  "black",
  "brown",
  "blonde",
  "red",
  "grey",
  "white",
  "dyed",
  "hidden",
];

export const HAIR_TEXTURES: CharacterAttributes["hairTexture"][] = [
  "straight",
  "wavy",
  "curly",
  "afro",
  "none",
  "hidden",
];

export const FACIAL_HAIRS: CharacterAttributes["facialHair"][] = [
  "none",
  "stubble",
  "moustache",
  "goatee",
  "beard",
];

export const GLASSES: CharacterAttributes["glasses"][] = [
  "none",
  "round",
  "square",
  "sunglasses",
];

export const HATS: CharacterAttributes["hat"][] = [
  "none",
  "cap",
  "beanie",
  "helmet",
  "crown",
  "cowboy_hat",
  "wizard_hat",
];

export const EYE_COLORS: CharacterAttributes["eyeColor"][] = [
  "brown",
  "blue",
  "green",
  "hazel",
  "grey",
  "not_visible",
];

export const EXPRESSIONS: CharacterAttributes["expression"][] = [
  "smiling_teeth",
  "smiling_closed",
  "neutral",
  "serious",
];

export const TOP_COLORS: CharacterAttributes["topColor"][] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "white",
  "purple",
  "orange",
];

export const OUTFIT_TYPES: CharacterAttributes["outfitType"][] = [
  "tshirt",
  "shirt",
  "hoodie",
  "jacket",
  "suit",
  "armour",
  "spacesuit",
  "robe",
  "drag_outfit",
];

export const ACCESSORIES: CharacterAttributes["accessory"][] = [
  "none",
  "coffee_mug",
  "laptop",
  "sword",
  "shield",
  "staff",
  "jetpack",
  "feather_boa",
  "microphone",
];

// ─── Gameplay Traits (used for balance scoring) ─────────────────────────────
// These are the attributes evaluated for distribution and similarity.
// themeTrait1 / themeTrait2 are excluded (free text, not enumerated).

export const GAMEPLAY_TRAITS = [
  "hairLength",
  "hairColor",
  "hairTexture",
  "facialHair",
  "glasses",
  "hat",
  "eyeColor",
  "expression",
  "topColor",
  "outfitType",
  "accessory",
] as const satisfies (keyof CharacterAttributes)[];

export type GameplayTrait = (typeof GAMEPLAY_TRAITS)[number];

// ─── Trait Weights (for similarity scoring) ─────────────────────────────────

export const TRAIT_WEIGHTS: Record<GameplayTrait, number> = {
  hairLength: 10,
  hairColor: 8,
  hairTexture: 5,
  facialHair: 12,
  glasses: 12,
  hat: 12,
  eyeColor: 4,
  expression: 5,
  topColor: 8,
  outfitType: 10,
  accessory: 12,
};

export const TOTAL_WEIGHT = Object.values(TRAIT_WEIGHTS).reduce(
  (sum, w) => sum + w,
  0
);

// ─── Distribution Targets ───────────────────────────────────────────────────

export const IDEAL_TRAIT_RANGE = {
  min: 6,
  max: 18,
  idealLow: 8,
  idealHigh: 16,
} as const;

// ─── Useful Question Ranges ─────────────────────────────────────────────────
// For a deck of 24, what count-range makes a yes/no question useful?

export function getQuestionUsefulness(
  count: number,
  total: number
): "poor" | "okay" | "good" {
  const poor = total <= 3 || total - count <= 3;
  if (count <= 3 || total - count <= 3) return "poor";

  // Roughly ≥ total*0.25 and ≤ total*0.75 = good
  const ratio = count / total;
  if (ratio >= 0.29 && ratio <= 0.71) return "good";
  return "okay";
}

// ─── Validation ─────────────────────────────────────────────────────────────

export function isValidAttribute<T extends string>(
  value: unknown,
  allowed: T[]
): value is T {
  return typeof value === "string" && (allowed as string[]).includes(value);
}
