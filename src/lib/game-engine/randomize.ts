import type { Character, CharacterAttributes, CharacterDraft, GameSet } from "@/types/game";
import {
  GAMEPLAY_TRAITS,
  GameplayTrait,
  IDEAL_TRAIT_RANGE,
  HAIR_LENGTHS,
  HAIR_COLORS,
  HAIR_TEXTURES,
  FACIAL_HAIRS,
  GLASSES,
  HATS,
  EYE_COLORS,
  EXPRESSIONS,
  TOP_COLORS,
} from "./attributes";
import { getThemeConfig } from "./themes";
import { REQUIRED_DECK_SIZE } from "./balance";
import { pickRandomName } from "./names";

// ─── Trait Value Pools ───────────────────────────────────────────────────────

const STATIC_TRAIT_POOLS: Partial<Record<GameplayTrait, readonly string[]>> = {
  hairLength: HAIR_LENGTHS,
  hairColor: HAIR_COLORS,
  hairTexture: HAIR_TEXTURES,
  facialHair: FACIAL_HAIRS,
  glasses: GLASSES,
  hat: HATS,
  eyeColor: EYE_COLORS,
  expression: EXPRESSIONS,
  topColor: TOP_COLORS,
};

// outfitType and accessory are theme-restricted — resolved per game set, never from
// STATIC_TRAIT_POOLS.
export const MUTABLE_TRAITS: GameplayTrait[] = [
  "accessory",
  "hat",
  "glasses",
  "outfitType",
  "topColor",
];

export function poolForTrait(trait: GameplayTrait, gameSet: GameSet): readonly string[] {
  if (trait === "outfitType") return getThemeConfig(gameSet.theme).allowedOutfits;
  if (trait === "accessory") return getThemeConfig(gameSet.theme).allowedAccessories;
  return STATIC_TRAIT_POOLS[trait] ?? [];
}

// ─── Balance-Aware Random Draft ──────────────────────────────────────────────

function countValues(chars: { attributes: CharacterAttributes }[], trait: GameplayTrait): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of chars) {
    const val = c.attributes[trait] as string;
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return counts;
}

function pickWeightedValue(
  trait: GameplayTrait,
  gameSet: GameSet,
  counts: Map<string, number>
): string {
  const pool = poolForTrait(trait, gameSet);
  const underRepresented = pool.filter((v) => (counts.get(v) ?? 0) < IDEAL_TRAIT_RANGE.idealHigh);
  const candidates = underRepresented.length > 0 ? underRepresented : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function planNewCharacters(characters: Character[], gameSet: GameSet): CharacterDraft[] {
  const slotsToFill = REQUIRED_DECK_SIZE - characters.length;
  if (slotsToFill <= 0) return [];

  const takenNames = new Set(characters.map((c) => c.displayName));
  const runningCounts = new Map<GameplayTrait, Map<string, number>>();
  for (const trait of GAMEPLAY_TRAITS) {
    runningCounts.set(trait, countValues(characters, trait));
  }

  const drafts: CharacterDraft[] = [];
  for (let i = 0; i < slotsToFill; i++) {
    const displayName = pickRandomName(gameSet.theme, takenNames);
    takenNames.add(displayName);

    const attributes: Record<string, string> = {};
    for (const trait of GAMEPLAY_TRAITS) {
      const counts = runningCounts.get(trait)!;
      const value = pickWeightedValue(trait, gameSet, counts);
      attributes[trait] = value;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    drafts.push({
      gameSetId: gameSet.id,
      displayName,
      referenceImageUrls: [],
      attributes: attributes as unknown as CharacterAttributes,
    });
  }

  return drafts;
}
