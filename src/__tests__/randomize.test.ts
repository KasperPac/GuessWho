import { planNewCharacters, resolveDuplicates } from "@/lib/game-engine/randomize";
import { MOCK_CHARACTERS, MOCK_GAME_SET } from "@/lib/game-engine/mockDeck";
import { GAMEPLAY_TRAITS } from "@/lib/game-engine/attributes";
import { getThemeConfig } from "@/lib/game-engine/themes";
import type { Character, CharacterDraft, GameSet } from "@/types/game";

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

  it("reports unresolved critical pairs left over when the iteration cap is hit", () => {
    const clones = Array.from({ length: 24 }, (_, i) =>
      cloneChar(MOCK_CHARACTERS[0], `clone-${i}`)
    );
    const { edits, unresolved } = resolveDuplicates(clones, [], MOCK_GAME_SET);

    expect(edits.length).toBeGreaterThan(0);
    expect(unresolved.length).toBeGreaterThan(0);
    for (const warning of unresolved) {
      expect(warning.severity).toBe("critical");
      expect(warning.affectedCharacterIds?.length).toBe(2);
    }
  });
});
