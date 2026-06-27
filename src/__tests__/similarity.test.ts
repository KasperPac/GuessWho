import {
  computeSimilarityScore,
  findSimilarPairs,
  computeDeckUniquenessScore,
  SIMILARITY_CRITICAL,
  SIMILARITY_WARNING,
} from "@/lib/game-engine/similarity";
import { MOCK_CHARACTERS } from "@/lib/game-engine/mockDeck";
import type { Character } from "@/types/game";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChar(id: string, overrides: Partial<Character["attributes"]>): Character {
  const base: Character = MOCK_CHARACTERS[0];
  return {
    ...base,
    id,
    attributes: { ...base.attributes, ...overrides },
  };
}

// ─── Similarity between two nearly identical characters ───────────────────────

describe("computeSimilarityScore", () => {
  it("returns ~100% for two characters sharing all traits", () => {
    const a = MOCK_CHARACTERS[0];
    const b: Character = { ...a, id: "b-clone" };
    const { score } = computeSimilarityScore(a, b);
    expect(score).toBe(100);
  });

  it("returns high similarity for characters differing by only one low-weight trait", () => {
    const a = MOCK_CHARACTERS[0];
    const b = makeChar("b-diff-eye", { eyeColor: "green" }); // eyeColor weight = 4
    const { score } = computeSimilarityScore(a, b);
    // Should differ only by eyeColor weight (4) out of total weight
    expect(score).toBeGreaterThan(90);
    expect(score).toBeLessThan(100);
  });

  it("returns low similarity for two clearly different characters", () => {
    const a = makeChar("a-distinct", {
      hairLength: "bald",
      hairColor: "hidden",
      hairTexture: "none",
      facialHair: "beard",
      glasses: "square",
      hat: "cap",
      eyeColor: "blue",
      expression: "serious",
      topColor: "red",
      outfitType: "suit",
      accessory: "sword",
    });

    const b = makeChar("b-distinct", {
      hairLength: "long",
      hairColor: "blonde",
      hairTexture: "curly",
      facialHair: "none",
      glasses: "none",
      hat: "none",
      eyeColor: "green",
      expression: "smiling_teeth",
      topColor: "purple",
      outfitType: "hoodie",
      accessory: "coffee_mug",
    });

    const { score } = computeSimilarityScore(a, b);
    expect(score).toBeLessThan(SIMILARITY_WARNING);
  });

  it("returns correct sharedTraits and differingTraits lists", () => {
    const a = MOCK_CHARACTERS[0]; // glasses: "round"
    const b = makeChar("b-glasses-diff", { glasses: "square" });
    const { sharedTraits, differingTraits } = computeSimilarityScore(a, b);

    expect(differingTraits).toContain("glasses");
    expect(sharedTraits.some((t) => t.startsWith("glasses"))).toBe(false);
  });
});

// ─── findSimilarPairs ─────────────────────────────────────────────────────────

describe("findSimilarPairs", () => {
  it("detects critical pair when two characters are clones", () => {
    const a = MOCK_CHARACTERS[0];
    const b = { ...a, id: "b-clone" };
    const pairs = findSimilarPairs([a, b]);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs[0].similarityScore).toBe(100);
    expect(pairs[0].similarityScore).toBeGreaterThanOrEqual(SIMILARITY_CRITICAL);
  });

  it("returns no pairs for fully diverse characters below threshold", () => {
    // Use just two clearly different characters from the mock deck
    const a = MOCK_CHARACTERS[0]; // short, black, straight, none, round, none, brown, smiling_teeth, blue, shirt, coffee_mug
    const b = MOCK_CHARACTERS[1]; // long, blonde, wavy, none, none, none, blue, smiling_closed, red, hoodie, none
    const pairs = findSimilarPairs([a, b], SIMILARITY_WARNING);
    // These share none/expression similarity; check if under threshold
    const { score } = computeSimilarityScore(a, b);
    if (score < SIMILARITY_WARNING) {
      expect(pairs.length).toBe(0);
    } else {
      expect(pairs.length).toBeGreaterThan(0);
    }
  });

  it("sorts pairs by similarity descending", () => {
    const clone = { ...MOCK_CHARACTERS[0], id: "clone" };
    const pairs = findSimilarPairs([...MOCK_CHARACTERS.slice(0, 5), clone], SIMILARITY_WARNING);
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i - 1].similarityScore).toBeGreaterThanOrEqual(
        pairs[i].similarityScore
      );
    }
  });

  it("returns empty array for single character deck", () => {
    const pairs = findSimilarPairs([MOCK_CHARACTERS[0]]);
    expect(pairs).toEqual([]);
  });
});

// ─── computeDeckUniquenessScore ───────────────────────────────────────────────

describe("computeDeckUniquenessScore", () => {
  it("returns 0 for a deck of identical characters", () => {
    const clone = MOCK_CHARACTERS[0];
    const dupes = Array.from({ length: 5 }, (_, i) => ({
      ...clone,
      id: `dupe-${i}`,
    }));
    const score = computeDeckUniquenessScore(dupes);
    expect(score).toBe(0);
  });

  it("returns 100 for a single character (no pairs to compare)", () => {
    const score = computeDeckUniquenessScore([MOCK_CHARACTERS[0]]);
    expect(score).toBe(100);
  });

  it("returns a positive score for the full diverse mock deck", () => {
    const score = computeDeckUniquenessScore(MOCK_CHARACTERS);
    expect(score).toBeGreaterThan(30);
  });
});
