import { evaluateDeck, REQUIRED_DECK_SIZE } from "@/lib/game-engine/balance";
import { MOCK_CHARACTERS, MOCK_GAME_SET } from "@/lib/game-engine/mockDeck";
import type { Character } from "@/types/game";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cloneChar(char: Character, id: string, overrides: Partial<Character["attributes"]> = {}): Character {
  return {
    ...char,
    id,
    attributes: { ...char.attributes, ...overrides },
  };
}

// ─── Deck Size Validation ────────────────────────────────────────────────────

describe("evaluateDeck — deck size", () => {
  it("marks deck as not playable when fewer than 24 characters", () => {
    const report = evaluateDeck(MOCK_CHARACTERS.slice(0, 10));
    expect(report.isPlayable).toBe(false);
    expect(
      report.warnings.some(
        (w) => w.severity === "critical" && w.message.includes("24")
      )
    ).toBe(true);
  });

  it("marks deck as not playable when more than 24 characters", () => {
    const extra = cloneChar(MOCK_CHARACTERS[0], "extra");
    const report = evaluateDeck([...MOCK_CHARACTERS, extra]);
    expect(report.isPlayable).toBe(false);
  });

  it("does not produce a size warning for exactly 24 characters", () => {
    const report = evaluateDeck(MOCK_CHARACTERS);
    const sizeWarnings = report.warnings.filter(
      (w) => w.message.includes("characters") && w.message.includes("required")
    );
    expect(sizeWarnings.length).toBe(0);
  });
});

// ─── Overused Trait Detection ────────────────────────────────────────────────

describe("evaluateDeck — overused traits", () => {
  it("warns when a single top colour dominates the deck", () => {
    // Make all 24 characters wear blue
    const blueArmy = MOCK_CHARACTERS.map((c, i) =>
      cloneChar(c, `blue-${i}`, { topColor: "blue" })
    );
    const report = evaluateDeck(blueArmy);
    const blueWarning = report.warnings.find(
      (w) => w.message.includes("blue") && w.message.includes("Top colour")
    );
    expect(blueWarning).toBeDefined();
  });

  it("warns when one expression is used by too many characters", () => {
    // Make all 24 characters have smiling_teeth
    const smileArmy = MOCK_CHARACTERS.map((c, i) =>
      cloneChar(c, `smile-${i}`, { expression: "smiling_teeth" })
    );
    const report = evaluateDeck(smileArmy);
    const expressionWarning = report.warnings.find(
      (w) => w.affectedTrait === "expression"
    );
    expect(expressionWarning).toBeDefined();
  });
});

// ─── Underused Trait Detection ────────────────────────────────────────────────

describe("evaluateDeck — underused traits", () => {
  it("warns when glasses are almost absent from the deck", () => {
    // Only 1 character has glasses
    const noGlasses = MOCK_CHARACTERS.map((c, i) =>
      cloneChar(c, `ng-${i}`, {
        glasses: i === 0 ? "round" : "none",
      })
    );
    const report = evaluateDeck(noGlasses);
    const glassesWarning = report.warnings.find(
      (w) => w.affectedTrait === "glasses"
    );
    expect(glassesWarning).toBeDefined();
    expect(
      glassesWarning?.severity === "warning" ||
        glassesWarning?.severity === "critical"
    ).toBe(true);
  });

  it("warns when hats are almost absent from the deck", () => {
    const noHats = MOCK_CHARACTERS.map((c, i) =>
      cloneChar(c, `nh-${i}`, { hat: "none" })
    );
    const report = evaluateDeck(noHats);
    const hatWarning = report.warnings.find(
      (w) => w.affectedTrait === "hat"
    );
    expect(hatWarning).toBeDefined();
  });
});

// ─── Score Calculation ────────────────────────────────────────────────────────

describe("evaluateDeck — score", () => {
  it("returns a score between 0 and 100", () => {
    const report = evaluateDeck(MOCK_CHARACTERS);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it("returns a higher score for the diverse mock deck than a monotone deck", () => {
    const diverseReport = evaluateDeck(MOCK_CHARACTERS);

    const monotone = MOCK_CHARACTERS.map((c, i) =>
      cloneChar(c, `mono-${i}`, {
        hairLength: "short",
        hairColor: "brown",
        hairTexture: "straight",
        facialHair: "none",
        glasses: "none",
        hat: "none",
        eyeColor: "brown",
        expression: "smiling_teeth",
        topColor: "blue",
        outfitType: "shirt",
        accessory: "none",
      })
    );
    const monotoneReport = evaluateDeck(monotone);

    expect(diverseReport.score).toBeGreaterThan(monotoneReport.score);
  });

  it("produces traitDistribution entries for all gameplay traits", () => {
    const report = evaluateDeck(MOCK_CHARACTERS);
    const traits = new Set(report.traitDistribution.map((d) => d.trait));
    expect(traits.has("hairLength")).toBe(true);
    expect(traits.has("glasses")).toBe(true);
    expect(traits.has("accessory")).toBe(true);
  });

  it("includes at least one 'good' usefulness trait in the diverse mock deck", () => {
    const report = evaluateDeck(MOCK_CHARACTERS);
    const hasGood = report.traitDistribution.some(
      (d) => d.usefulness === "good"
    );
    expect(hasGood).toBe(true);
  });
});

// ─── Playability Gate ────────────────────────────────────────────────────────

describe("evaluateDeck — isPlayable", () => {
  it("marks a deck as playable when score ≥ 50 and no critical warnings", () => {
    const report = evaluateDeck(MOCK_CHARACTERS);
    // Our diverse mock deck should pass
    if (report.score >= 50 && !report.warnings.some((w) => w.severity === "critical")) {
      expect(report.isPlayable).toBe(true);
    }
  });

  it("marks a monotone deck as not playable", () => {
    const monotone = MOCK_CHARACTERS.map((c, i) =>
      cloneChar(c, `mono-${i}`, {
        hairLength: "short",
        hairColor: "brown",
        hairTexture: "straight",
        facialHair: "none",
        glasses: "none",
        hat: "none",
        eyeColor: "brown",
        expression: "smiling_teeth",
        topColor: "blue",
        outfitType: "shirt",
        accessory: "none",
      })
    );
    const report = evaluateDeck(monotone);
    expect(report.isPlayable).toBe(false);
  });
});
