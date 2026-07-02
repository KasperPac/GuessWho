import type { Character, CharacterAttributes, CharacterDraft, CharacterEdit, DeckWarning, GameSet } from "@/types/game";
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
import { findSimilarPairs, computeSimilarityScore, SIMILARITY_CRITICAL } from "./similarity";

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

    const attributes: Partial<CharacterAttributes> = {};
    for (const trait of GAMEPLAY_TRAITS) {
      const counts = runningCounts.get(trait)!;
      const value = pickWeightedValue(trait, gameSet, counts);
      (attributes as Record<string, string>)[trait] = value;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    drafts.push({
      gameSetId: gameSet.id,
      displayName,
      referenceImageUrls: [],
      attributes: attributes as CharacterAttributes,
    });
  }

  return drafts;
}

// ─── Duplicate Resolution ─────────────────────────────────────────────────────

type WorkingChar =
  | { kind: "existing"; id: string; displayName: string; attributes: CharacterAttributes }
  | { kind: "draft"; index: number; displayName: string; attributes: CharacterAttributes };

function workingTag(w: WorkingChar): string {
  return w.kind === "existing" ? `existing:${w.id}` : `draft:${w.index}`;
}

function toFakeCharacter(w: WorkingChar, gameSetId: string): Character {
  return {
    id: workingTag(w),
    gameSetId,
    displayName: w.displayName,
    referenceImageUrls: [],
    attributes: w.attributes,
    createdAt: "",
    updatedAt: "",
  };
}

function attemptResolve(
  target: WorkingChar,
  other: WorkingChar,
  gameSet: GameSet
): { changes: CharacterEdit["changes"]; attributes: CharacterAttributes } | null {
  const changes: CharacterEdit["changes"] = [];
  const attributes: CharacterAttributes = { ...target.attributes };
  const attrs = attributes as Record<string, string>;

  for (const trait of MUTABLE_TRAITS) {
    const otherValue = other.attributes[trait] as string;
    if (attrs[trait] !== otherValue) continue; // not shared — mutating it won't reduce similarity

    const pool = poolForTrait(trait, gameSet).filter((v) => v !== otherValue);
    if (pool.length === 0) continue;

    const from = attrs[trait];
    const to = pool[Math.floor(Math.random() * pool.length)];
    attrs[trait] = to;
    changes.push({ trait, from, to });

    const score = computeSimilarityScore(
      toFakeCharacter({ ...target, attributes }, gameSet.id),
      toFakeCharacter(other, gameSet.id)
    ).score;

    if (score < SIMILARITY_CRITICAL) {
      return { changes, attributes };
    }
  }

  return null;
}

export function resolveDuplicates(
  existingCharacters: Character[],
  draftCharacters: CharacterDraft[],
  gameSet: GameSet
): { updatedDrafts: CharacterDraft[]; edits: CharacterEdit[]; unresolved: DeckWarning[] } {
  const working: WorkingChar[] = [
    ...existingCharacters.map((c): WorkingChar => ({
      kind: "existing",
      id: c.id,
      displayName: c.displayName,
      attributes: { ...c.attributes },
    })),
    ...draftCharacters.map((d, index): WorkingChar => ({
      kind: "draft",
      index,
      displayName: d.displayName,
      attributes: { ...d.attributes },
    })),
  ];

  const editsByCharId = new Map<string, CharacterEdit>();
  const unresolved: DeckWarning[] = [];
  const skipPairKeys = new Set<string>();

  for (let iteration = 0; iteration < 50; iteration++) {
    const fakeChars = working.map((w) => toFakeCharacter(w, gameSet.id));
    const pairs = findSimilarPairs(fakeChars, SIMILARITY_CRITICAL).filter(
      (p) => !skipPairKeys.has(`${p.characterAId}|${p.characterBId}`)
    );
    if (pairs.length === 0) break;

    const pair = pairs[0];
    const pairKey = `${pair.characterAId}|${pair.characterBId}`;
    const aIndex = working.findIndex((w) => workingTag(w) === pair.characterAId);
    const bIndex = working.findIndex((w) => workingTag(w) === pair.characterBId);
    const a = working[aIndex];
    const b = working[bIndex];

    const target = a.kind === "draft" ? a : b.kind === "draft" ? b : a;
    const other = target === a ? b : a;
    const targetIndex = target === a ? aIndex : bIndex;
    const otherIndex = target === a ? bIndex : aIndex;

    const result = attemptResolve(target, other, gameSet);

    if (result) {
      working[targetIndex] = { ...target, attributes: result.attributes };
      if (target.kind === "existing") {
        const previous = editsByCharId.get(target.id);
        const changes = previous ? [...previous.changes, ...result.changes] : result.changes;
        editsByCharId.set(target.id, {
          characterId: target.id,
          displayName: target.displayName,
          changes,
        });
      }
    } else {
      unresolved.push({
        severity: "critical",
        message: `"${a.displayName}" and "${b.displayName}" are ${pair.similarityScore}% similar and could not be resolved without changing hair, eyes, expression, or facial hair.`,
        affectedCharacterIds: [
          a.kind === "existing" ? a.id : `new:${a.index}`,
          b.kind === "existing" ? b.id : `new:${b.index}`,
        ],
      });
      skipPairKeys.add(pairKey);
    }
  }

  // Final sweep: report any critical pair still remaining (e.g. the iteration cap was
  // reached before every pair was processed) that we haven't already reported.
  const finalFakeChars = working.map((w) => toFakeCharacter(w, gameSet.id));
  const finalPairs = findSimilarPairs(finalFakeChars, SIMILARITY_CRITICAL);
  for (const pair of finalPairs) {
    const pairKey = `${pair.characterAId}|${pair.characterBId}`;
    if (skipPairKeys.has(pairKey)) continue;
    skipPairKeys.add(pairKey);
    const aIndex = working.findIndex((w) => workingTag(w) === pair.characterAId);
    const bIndex = working.findIndex((w) => workingTag(w) === pair.characterBId);
    const a = working[aIndex];
    const b = working[bIndex];
    unresolved.push({
      severity: "critical",
      message: `"${a.displayName}" and "${b.displayName}" are ${pair.similarityScore}% similar and could not be resolved within the iteration budget.`,
      affectedCharacterIds: [
        a.kind === "existing" ? a.id : `new:${a.index}`,
        b.kind === "existing" ? b.id : `new:${b.index}`,
      ],
    });
  }

  const updatedDrafts = draftCharacters.map((d, index) => {
    const w = working.find(
      (w): w is Extract<WorkingChar, { kind: "draft" }> => w.kind === "draft" && w.index === index
    )!;
    return { ...d, attributes: w.attributes };
  });

  return { updatedDrafts, edits: Array.from(editsByCharId.values()), unresolved };
}
