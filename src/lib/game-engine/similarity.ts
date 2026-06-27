import type { Character, SimilarCharacterPair } from "@/types/game";
import { GAMEPLAY_TRAITS, TRAIT_WEIGHTS, TOTAL_WEIGHT } from "./attributes";

// ─── Similarity Thresholds ───────────────────────────────────────────────────

export const SIMILARITY_CRITICAL = 80;
export const SIMILARITY_WARNING = 65;

// ─── Single-Pair Scoring ────────────────────────────────────────────────────

export function computeSimilarityScore(
  a: Character,
  b: Character
): { score: number; sharedTraits: string[]; differingTraits: string[] } {
  let matchedWeight = 0;
  const sharedTraits: string[] = [];
  const differingTraits: string[] = [];

  for (const trait of GAMEPLAY_TRAITS) {
    const valA = a.attributes[trait];
    const valB = b.attributes[trait];
    const weight = TRAIT_WEIGHTS[trait];

    if (valA !== undefined && valB !== undefined && valA === valB) {
      matchedWeight += weight;
      sharedTraits.push(`${trait}:${valA}`);
    } else {
      differingTraits.push(trait);
    }
  }

  const score = Math.round((matchedWeight / TOTAL_WEIGHT) * 100);
  return { score, sharedTraits, differingTraits };
}

// ─── All-Pairs Comparison ────────────────────────────────────────────────────

export function findSimilarPairs(
  characters: Character[],
  minScore = SIMILARITY_WARNING
): SimilarCharacterPair[] {
  const pairs: SimilarCharacterPair[] = [];

  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const a = characters[i];
      const b = characters[j];
      const { score, sharedTraits, differingTraits } = computeSimilarityScore(
        a,
        b
      );

      if (score >= minScore) {
        pairs.push({
          characterAId: a.id,
          characterBId: b.id,
          similarityScore: score,
          sharedTraits,
          differingTraits,
        });
      }
    }
  }

  // Most similar first
  return pairs.sort((a, b) => b.similarityScore - a.similarityScore);
}

// ─── Character-Level Uniqueness Score ───────────────────────────────────────
// Average similarity of a character against all others, inverted.

export function computeCharacterUniquenessScore(
  character: Character,
  others: Character[]
): number {
  if (others.length === 0) return 100;

  const totalSimilarity = others.reduce((sum, other) => {
    return sum + computeSimilarityScore(character, other).score;
  }, 0);

  const avgSimilarity = totalSimilarity / others.length;
  return Math.round(100 - avgSimilarity);
}

// ─── Deck-Level Uniqueness Score (0-100) ────────────────────────────────────

export function computeDeckUniquenessScore(characters: Character[]): number {
  if (characters.length < 2) return 100;

  let totalSimilarity = 0;
  let pairCount = 0;

  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      totalSimilarity += computeSimilarityScore(
        characters[i],
        characters[j]
      ).score;
      pairCount++;
    }
  }

  const avgSimilarity = totalSimilarity / pairCount;
  return Math.round(100 - avgSimilarity);
}
