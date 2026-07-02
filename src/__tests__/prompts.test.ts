import { generateCharacterPrompt, generateAllPrompts, generateImagePrompt } from "@/lib/game-engine/prompts";
import { MOCK_CHARACTERS, MOCK_GAME_SET } from "@/lib/game-engine/mockDeck";
import type { Character, GameSet } from "@/types/game";
import { ALL_THEMES } from "@/lib/game-engine/themes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGameSet(theme: GameSet["theme"]): GameSet {
  return { ...MOCK_GAME_SET, theme };
}

function makeChar(overrides: Partial<Character["attributes"]>): Character {
  return {
    ...MOCK_CHARACTERS[0],
    attributes: { ...MOCK_CHARACTERS[0].attributes, ...overrides },
  };
}

// ─── Prompt structure ────────────────────────────────────────────────────────

describe("generateCharacterPrompt — structure", () => {
  it("includes the character name", () => {
    const char = MOCK_CHARACTERS[0];
    const prompt = generateCharacterPrompt(char, MOCK_GAME_SET);
    expect(prompt).toContain(char.displayName);
  });

  it("includes the base style instruction", () => {
    const prompt = generateCharacterPrompt(MOCK_CHARACTERS[0], MOCK_GAME_SET);
    expect(prompt).toMatch(/tabletop face-guessing game/i);
  });

  it("includes theme instruction for classic_office", () => {
    const prompt = generateCharacterPrompt(MOCK_CHARACTERS[0], makeGameSet("classic_office"));
    expect(prompt).toMatch(/office professional/i);
  });

  it("never mentions 'Guess Who'", () => {
    for (const char of MOCK_CHARACTERS) {
      const prompt = generateCharacterPrompt(char, MOCK_GAME_SET);
      expect(prompt.toLowerCase()).not.toContain("guess who");
    }
  });
});

// ─── Theme-specific prompts ────────────────────────────────────────────────

describe("generateCharacterPrompt — all themes", () => {
  for (const theme of ALL_THEMES) {
    it(`generates a non-empty prompt for theme: ${theme}`, () => {
      const set = makeGameSet(theme);
      const prompt = generateCharacterPrompt(MOCK_CHARACTERS[0], set);
      expect(prompt.trim().length).toBeGreaterThan(100);
    });
  }

  it("includes 'space ranger' instruction for space_rangers theme", () => {
    const prompt = generateCharacterPrompt(MOCK_CHARACTERS[0], makeGameSet("space_rangers"));
    expect(prompt).toMatch(/space ranger/i);
  });

  it("includes 'medieval' or 'knight' instruction for medieval_knights theme", () => {
    const prompt = generateCharacterPrompt(MOCK_CHARACTERS[0], makeGameSet("medieval_knights"));
    expect(prompt).toMatch(/medieval|knight/i);
  });

  it("includes 'drag royalty' or 'glamorous' instruction for drag_royalty theme", () => {
    const prompt = generateCharacterPrompt(MOCK_CHARACTERS[0], makeGameSet("drag_royalty"));
    expect(prompt).toMatch(/drag royalty|glamorous/i);
  });
});

// ─── Attribute narration ────────────────────────────────────────────────────

describe("generateCharacterPrompt — attribute descriptions", () => {
  it("describes bald correctly", () => {
    const char = makeChar({ hairLength: "bald" });
    const prompt = generateCharacterPrompt(char, MOCK_GAME_SET);
    expect(prompt).toMatch(/bald/i);
  });

  it("describes beard correctly", () => {
    const char = makeChar({ facialHair: "beard" });
    const prompt = generateCharacterPrompt(char, MOCK_GAME_SET);
    expect(prompt).toMatch(/beard/i);
  });

  it("describes glasses correctly", () => {
    const char = makeChar({ glasses: "sunglasses" });
    const prompt = generateCharacterPrompt(char, MOCK_GAME_SET);
    expect(prompt).toMatch(/sunglasses/i);
  });

  it("describes hat correctly", () => {
    const char = makeChar({ hat: "wizard_hat" });
    const prompt = generateCharacterPrompt(char, MOCK_GAME_SET);
    expect(prompt).toMatch(/wizard hat/i);
  });

  it("describes accessory correctly", () => {
    const char = makeChar({ accessory: "sword" });
    const prompt = generateCharacterPrompt(char, MOCK_GAME_SET);
    expect(prompt).toMatch(/sword/i);
  });

  it("includes themeTrait1 and themeTrait2 when set", () => {
    const char: Character = {
      ...MOCK_CHARACTERS[0],
      attributes: {
        ...MOCK_CHARACTERS[0].attributes,
        themeTrait1: "wearing a monocle",
        themeTrait2: "has a scar on the left cheek",
      },
    };
    const prompt = generateCharacterPrompt(char, MOCK_GAME_SET);
    expect(prompt).toContain("wearing a monocle");
    expect(prompt).toContain("has a scar on the left cheek");
  });
});

// ─── generateAllPrompts ──────────────────────────────────────────────────────

describe("generateAllPrompts", () => {
  it("returns a prompt for every character", () => {
    const prompts = generateAllPrompts(MOCK_CHARACTERS, MOCK_GAME_SET);
    expect(prompts.size).toBe(MOCK_CHARACTERS.length);
    for (const char of MOCK_CHARACTERS) {
      expect(prompts.has(char.id)).toBe(true);
      expect(prompts.get(char.id)!.length).toBeGreaterThan(0);
    }
  });

  it("generates unique prompts for characters with different attributes", () => {
    const prompts = generateAllPrompts(MOCK_CHARACTERS, MOCK_GAME_SET);
    const values = Array.from(prompts.values());
    const uniqueValues = new Set(values);
    // All 24 characters in the mock deck have different attributes — prompts should differ
    expect(uniqueValues.size).toBe(MOCK_CHARACTERS.length);
  });
});

describe("generateImagePrompt — text-only characters (no reference photo)", () => {
  it("does not reference a photo anywhere in the prompt when there are no reference images", () => {
    const char: Character = { ...MOCK_CHARACTERS[0], referenceImageUrls: [] };
    const prompt = generateImagePrompt(char, MOCK_GAME_SET);
    expect(prompt.toLowerCase()).not.toContain("use the attached photo");
    expect(prompt.toLowerCase()).not.toContain("reference photo");
  });

  it("forces physical appearance overrides into the prompt when there is no reference photo", () => {
    const char: Character = {
      ...MOCK_CHARACTERS[0],
      referenceImageUrls: [],
      attributes: { ...MOCK_CHARACTERS[0].attributes, hairColor: "red", hairLength: "long" },
    };
    const prompt = generateImagePrompt(char, MOCK_GAME_SET, false);
    expect(prompt).toMatch(/red.*hair|hair.*red/i);
  });

  it("still includes the VISUAL REFERENCE photo instruction when a reference photo is present", () => {
    const char: Character = { ...MOCK_CHARACTERS[0], referenceImageUrls: ["https://example.com/a.jpg"] };
    const prompt = generateImagePrompt(char, MOCK_GAME_SET);
    expect(prompt.toLowerCase()).toContain("use the attached photo");
  });

  it("does not force physical overrides when a reference photo is present and includePhysicalOverrides is false", () => {
    const char: Character = { ...MOCK_CHARACTERS[0], referenceImageUrls: ["https://example.com/a.jpg"] };
    const prompt = generateImagePrompt(char, MOCK_GAME_SET, false);
    expect(prompt).not.toContain("APPEARANCE OVERRIDES");
  });
});
