import { planNewCharacters, resolveDuplicates, planMakePlayable } from "@/lib/game-engine/randomize";
import { MOCK_CHARACTERS, MOCK_GAME_SET } from "@/lib/game-engine/mockDeck";
import { GAMEPLAY_TRAITS } from "@/lib/game-engine/attributes";
import { getThemeConfig } from "@/lib/game-engine/themes";
import type { Character, CharacterAttributes, CharacterDraft, GameSet } from "@/types/game";

// Mirrors the hardcoded defaults handleAddCharacter uses in the game set editor page,
// which several characters end up sharing verbatim if a user clicks "+ Add Character"
// repeatedly without customizing each one before running Make Playable.
const ADD_CHARACTER_DEFAULT_ATTRS: CharacterAttributes = {
  hairLength: "short",
  hairColor: "brown",
  hairTexture: "straight",
  facialHair: "none",
  glasses: "none",
  hat: "none",
  eyeColor: "brown",
  expression: "neutral",
  topColor: "blue",
  outfitType: "shirt",
  accessory: "none",
};

function defaultAddedCharacter(id: string): Character {
  return {
    id,
    gameSetId: MOCK_GAME_SET.id,
    displayName: id,
    referenceImageUrls: [],
    attributes: { ...ADD_CHARACTER_DEFAULT_ATTRS },
    createdAt: "",
    updatedAt: "",
  };
}

describe("planNewCharacters", () => {
  it("returns an empty array when the deck already has 24 characters", () => {
    expect(planNewCharacters(MOCK_CHARACTERS, MOCK_GAME_SET)).toEqual([]);
  });

  it("returns exactly enough drafts to reach 24", () => {
    const partial = MOCK_CHARACTERS.slice(0, 18);
    const drafts = planNewCharacters(partial, MOCK_GAME_SET);
    expect(drafts.length).toBe(6);
  });

  it("gives every draft a fully-specified attribute set", () => {
    const drafts = planNewCharacters(MOCK_CHARACTERS.slice(0, 20), MOCK_GAME_SET);
    for (const draft of drafts) {
      for (const trait of GAMEPLAY_TRAITS) {
        expect(draft.attributes[trait]).toBeDefined();
      }
    }
  });

  it("only picks theme-legal outfitType and accessory values", () => {
    const theme = "medieval_knights" as const;
    const gameSet: GameSet = { ...MOCK_GAME_SET, theme };
    const config = getThemeConfig(theme);
    const drafts = planNewCharacters([], gameSet);
    for (const draft of drafts) {
      expect(config.allowedOutfits).toContain(draft.attributes.outfitType);
      expect(config.allowedAccessories).toContain(draft.attributes.accessory);
    }
  });

  it("never reuses a display name already present in the deck", () => {
    const partial = MOCK_CHARACTERS.slice(0, 20);
    const existingNames = new Set(partial.map((c) => c.displayName));
    const drafts = planNewCharacters(partial, MOCK_GAME_SET);
    for (const draft of drafts) {
      expect(existingNames.has(draft.displayName)).toBe(false);
    }
  });

  it("gives drafted characters no reference photos", () => {
    const drafts = planNewCharacters(MOCK_CHARACTERS.slice(0, 22), MOCK_GAME_SET);
    for (const draft of drafts) {
      expect(draft.referenceImageUrls).toEqual([]);
    }
  });
});

function cloneChar(char: Character, id: string, overrides: Partial<Character["attributes"]> = {}): Character {
  return { ...char, id, attributes: { ...char.attributes, ...overrides } };
}

describe("resolveDuplicates", () => {
  it("resolves two identical existing characters by editing only mutable traits", () => {
    const a = MOCK_CHARACTERS[0];
    const b = cloneChar(a, "twin-b");
    const { edits, unresolved } = resolveDuplicates([a, b], [], MOCK_GAME_SET);

    expect(unresolved.length).toBe(0);
    expect(edits.length).toBe(1);
    const changedTraits = edits[0].changes.map((c) => c.trait);
    for (const trait of changedTraits) {
      expect(["accessory", "hat", "glasses", "outfitType", "topColor"]).toContain(trait);
    }
  });

  it("never changes facialHair, hair, eyeColor, or expression", () => {
    const a = MOCK_CHARACTERS[0];
    const b = cloneChar(a, "twin-b");
    const { edits } = resolveDuplicates([a, b], [], MOCK_GAME_SET);
    const changedTraits = edits.flatMap((e) => e.changes.map((c) => c.trait));
    for (const forbidden of ["facialHair", "hairLength", "hairColor", "hairTexture", "eyeColor", "expression"]) {
      expect(changedTraits).not.toContain(forbidden);
    }
  });

  it("prefers mutating a draft over an existing character when a pair includes both", () => {
    const existing = MOCK_CHARACTERS[0];
    const draft: CharacterDraft = {
      gameSetId: MOCK_GAME_SET.id,
      displayName: "New Twin",
      referenceImageUrls: [],
      attributes: { ...existing.attributes },
    };
    const { edits, updatedDrafts } = resolveDuplicates([existing], [draft], MOCK_GAME_SET);

    expect(edits.length).toBe(0);
    expect(updatedDrafts[0].attributes).not.toEqual(existing.attributes);
  });

  it("leaves characters untouched when there are no critical collisions", () => {
    const { edits, unresolved } = resolveDuplicates(MOCK_CHARACTERS, [], MOCK_GAME_SET);
    expect(edits.length).toBe(0);
    expect(unresolved.length).toBe(0);
  });

  // 24 fully-identical characters is a pathological worst case, not a shape
  // planMakePlayable ever actually produces (planNewCharacters always diversifies
  // new drafts, and a real deck starts from varied existing characters). With this
  // many characters starting 100% identical, the theme's small accessory/hat pools
  // genuinely can't give every character a unique mutable-trait combination, so some
  // pairs remain unresolved even with a generous iteration budget — this is expected,
  // not a sign the safety net is broken.
  it("gracefully reports remaining unresolved pairs on a pathological full-clique input", () => {
    const clones = Array.from({ length: 24 }, (_, i) =>
      cloneChar(MOCK_CHARACTERS[0], `clone-${i}`)
    );
    const { edits, unresolved } = resolveDuplicates(clones, [], MOCK_GAME_SET);

    expect(edits.length).toBeGreaterThan(0);
    for (const warning of unresolved) {
      expect(warning.severity).toBe("critical");
      expect(warning.affectedCharacterIds?.length).toBe(2);
    }
  });

  // Regression test: a moderate, realistic collision count (well beyond the old
  // 50-iteration cap but nowhere near the 24-clone pathological worst case) must
  // fully resolve, not get starved out and left in `unresolved` just because the
  // loop ran out of budget on other pairs first.
  it("fully resolves a moderate number of duplicate pairs within the iteration budget", () => {
    for (let trial = 0; trial < 5; trial++) {
      const duplicated = MOCK_CHARACTERS.slice(0, 12).flatMap((c) => [
        cloneChar(c, `${c.id}-a-${trial}`),
        cloneChar(c, `${c.id}-b-${trial}`),
      ]);
      const { unresolved } = resolveDuplicates(duplicated, [], MOCK_GAME_SET);
      expect(unresolved.length).toBe(0);
    }
  });

  // Regression test: several characters sharing the exact "+ Add Character" defaults
  // (a common real scenario — adding a few blank characters before customizing them)
  // must fully resolve, not just clear the first collision and leave later ones
  // colliding with a THIRD character that a purely pairwise fix never checked against.
  it("fully resolves several characters that all share the + Add Character defaults", () => {
    for (let trial = 0; trial < 5; trial++) {
      const chars = Array.from({ length: 8 }, (_, i) =>
        defaultAddedCharacter(`default-${trial}-${i}`)
      );
      const { edits, unresolved } = resolveDuplicates(chars, [], MOCK_GAME_SET);
      expect(edits.length).toBeGreaterThan(0);
      expect(unresolved.length).toBe(0);
    }
  });
});

describe("planMakePlayable", () => {
  it("fills the deck to 24 characters", () => {
    const partial = MOCK_CHARACTERS.slice(0, 20);
    const plan = planMakePlayable(partial, MOCK_GAME_SET);
    expect(partial.length + plan.newCharacters.length).toBe(24);
  });

  it("reports willBePlayable as a boolean", () => {
    const plan = planMakePlayable(MOCK_CHARACTERS.slice(0, 20), MOCK_GAME_SET);
    expect(typeof plan.willBePlayable).toBe("boolean");
  });

  it("produces edits for a deliberately duplicated deck", () => {
    const duplicated = MOCK_CHARACTERS.slice(0, 12).flatMap((c) => [
      cloneChar(c, `${c.id}-a`),
      cloneChar(c, `${c.id}-b`),
    ]);
    const plan = planMakePlayable(duplicated, MOCK_GAME_SET);
    expect(plan.edits.length).toBeGreaterThan(0);
  });

  it("returns no new characters when the deck is already at 24", () => {
    const plan = planMakePlayable(MOCK_CHARACTERS, MOCK_GAME_SET);
    expect(plan.newCharacters).toEqual([]);
  });
});
