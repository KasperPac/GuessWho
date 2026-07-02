import { planNewCharacters } from "@/lib/game-engine/randomize";
import { MOCK_CHARACTERS, MOCK_GAME_SET } from "@/lib/game-engine/mockDeck";
import { GAMEPLAY_TRAITS } from "@/lib/game-engine/attributes";
import { getThemeConfig } from "@/lib/game-engine/themes";
import type { GameSet } from "@/types/game";

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
