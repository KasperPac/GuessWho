# Make Playable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Make Playable" action to the game set editor that fills empty character slots with randomized, theme-appropriate characters and resolves any remaining critical similarity collisions by adjusting only accessory-like traits on existing characters — without ever touching hair or facial likeness.

**Architecture:** Two new pure functions (`planNewCharacters`, `resolveDuplicates`, combined by `planMakePlayable`) in a new `src/lib/game-engine/randomize.ts` compute a `MakePlayablePlan` from the current deck. A new `MakePlayableModal` component previews the plan. On confirm, `page.tsx` persists it via the existing `createCharacter`/`updateCharacter` DB helpers and the existing per-character image-generation loop. Two existing files (`GeminiImageProvider.ts`, the generate API route) and `prompts.ts` are relaxed to support generating an image for a character with no reference photo, since new fill-in characters won't have one.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase, Jest + ts-jest. No new packages, no new tables, no new API routes.

Reference spec: `docs/superpowers/specs/2026-07-02-make-playable-design.md`

---

## File Structure

- **Create** `src/lib/game-engine/names.ts` — per-theme random name pools.
- **Create** `src/lib/game-engine/randomize.ts` — `planNewCharacters`, `resolveDuplicates`, `planMakePlayable`.
- **Create** `src/components/game-sets/MakePlayableModal.tsx` — preview/confirm UI.
- **Create** `src/__tests__/names.test.ts`, `src/__tests__/randomize.test.ts`, `src/__tests__/GeminiImageProvider.test.ts`.
- **Modify** `src/types/game.ts` — add `CharacterDraft`, `CharacterEdit`, `MakePlayablePlan` types.
- **Modify** `src/lib/image-generation/GeminiImageProvider.ts` — allow empty `referenceImageUrls`.
- **Modify** `src/app/api/characters/[id]/generate/route.ts` — remove the reference-photo requirement.
- **Modify** `src/lib/game-engine/prompts.ts` — `generateImagePrompt` handles the no-photo case.
- **Modify** `src/__tests__/prompts.test.ts` — add coverage for the no-photo case.
- **Modify** `src/app/game-sets/[id]/page.tsx` — button, state, handlers, modal wiring.

---

### Task 1: Theme-based random name pools

**Goal:** A pure module that hands out a random, theme-appropriate, not-already-used character name.

**Files:**
- Create: `src/lib/game-engine/names.ts`
- Test: `src/__tests__/names.test.ts`

**Acceptance Criteria:**
- [ ] Every `GameTheme` has a non-empty, duplicate-free name pool.
- [ ] `pickRandomName` never returns a name already in the `taken` set.
- [ ] `pickRandomName` falls back to `"Character N"` (next free number) once a theme's pool is exhausted.

**Verify:** `node node_modules/jest/bin/jest.js src/__tests__/names.test.ts` → all tests pass.

**Steps:**

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/names.test.ts
import { pickRandomName, THEME_NAME_POOLS } from "@/lib/game-engine/names";
import { ALL_THEMES } from "@/lib/game-engine/themes";

describe("THEME_NAME_POOLS", () => {
  it("has a non-empty pool for every theme", () => {
    for (const theme of ALL_THEMES) {
      expect(THEME_NAME_POOLS[theme].length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate names within a single theme's pool", () => {
    for (const theme of ALL_THEMES) {
      const pool = THEME_NAME_POOLS[theme];
      expect(new Set(pool).size).toBe(pool.length);
    }
  });
});

describe("pickRandomName", () => {
  it("returns a name from the theme's pool", () => {
    const name = pickRandomName("pirates", new Set());
    expect(THEME_NAME_POOLS.pirates).toContain(name);
  });

  it("never returns a name already in the taken set", () => {
    const pool = THEME_NAME_POOLS.classic_office;
    const taken = new Set(pool.slice(0, pool.length - 1));
    const name = pickRandomName("classic_office", taken);
    expect(name).toBe(pool[pool.length - 1]);
  });

  it("falls back to a numbered placeholder when the entire pool is taken", () => {
    const taken = new Set(THEME_NAME_POOLS.cyberpunk);
    const name = pickRandomName("cyberpunk", taken);
    expect(name).toMatch(/^Character \d+$/);
  });

  it("does not collide with an already-taken numbered placeholder", () => {
    const taken = new Set([...THEME_NAME_POOLS.cyberpunk, "Character 1"]);
    const name = pickRandomName("cyberpunk", taken);
    expect(name).toBe("Character 2");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/jest/bin/jest.js src/__tests__/names.test.ts`
Expected: FAIL — `Cannot find module '@/lib/game-engine/names'`

- [ ] **Step 3: Implement the module**

```ts
// src/lib/game-engine/names.ts
import type { GameTheme } from "@/types/game";

export const THEME_NAME_POOLS: Record<GameTheme, string[]> = {
  classic_office: [
    "Alex", "Priya", "Jordan", "Morgan", "Sam", "Taylor", "Casey", "Riley",
    "Devon", "Jamie", "Avery", "Blair", "Cameron", "Dana", "Elliot", "Frankie",
    "Harper", "Indira", "Jules", "Kendall",
  ],
  farewell_gift: [
    "Nadia", "Oscar", "Petra", "Quinn", "Reese", "Sasha", "Toby", "Uma",
    "Val", "Wren", "Xiomara", "Yusuf", "Zoe", "Bianca", "Caleb", "Dahlia",
    "Ezra", "Fiona", "Gideon", "Hazel",
  ],
  remote_team: [
    "Milo", "Nia", "Otis", "Pia", "Rhys", "Suki", "Theo", "Vera",
    "Wes", "Yara", "Zane", "Abel", "Bex", "Coco", "Dax", "Ember",
    "Finn", "Gia", "Huxley", "Iris",
  ],
  drag_royalty: [
    "Crystal Chaos", "Vanity Voltage", "Bibi Sparkle", "Diamond DeLuxe",
    "Foxxy Flame", "Glitter Galore", "Honey Hurricane", "Ivy Inferno",
    "Jazzy Jubilee", "Kiki Kaleidoscope", "Luna Lush", "Mimi Moonshine",
    "Nova Nightshade", "Opal Obsession", "Peaches Prestige", "Ruby Riot",
    "Sable Sensation", "Tiara Tempest", "Venus Vortex", "Xtra Xtravaganza",
  ],
  medieval_knights: [
    "Sir Cedric", "Sir Roland", "Lady Elowen", "Sir Bertrand", "Lady Isolde",
    "Sir Gareth", "Lady Wren", "Sir Alaric", "Lady Rosalind", "Sir Tristan",
    "Lady Genevieve", "Sir Percival", "Lady Maren", "Sir Oswin", "Lady Briar",
    "Sir Dunstan", "Lady Ottilie", "Sir Fenwick", "Lady Seraphina", "Sir Godric",
  ],
  space_rangers: [
    "Captain Vega", "Ranger Orion", "Commander Nova", "Pilot Cyra",
    "Ranger Kepler", "Commander Zephyr", "Pilot Lyra", "Ranger Titan",
    "Commander Astra", "Pilot Rigel", "Ranger Sirius", "Commander Juno",
    "Pilot Draco", "Ranger Phoenix", "Commander Vesper", "Pilot Atlas",
    "Ranger Nyx", "Commander Halley", "Pilot Io", "Ranger Comet",
  ],
  pirates: [
    "Captain Blackwater", "Redbeard Finn", "One-Eyed Sal", "Scarlett Storm",
    "Bosun Grimes", "Cutlass Kate", "Salty Jack", "Iron Molly",
    "Barnacle Bill", "Anne Ravage", "Peg-Leg Pete", "Mad Maggie",
    "Cannonball Cole", "Silver Sadie", "Roaring Ruth", "Dread Duncan",
    "Plank Percy", "Hazel Hurricane", "Doubloon Doyle", "Tempest Tara",
  ],
  cyberpunk: [
    "Nyx-7", "Glitch", "Vex Karnov", "Riven", "Static Sable", "Neo Kade",
    "Chrome Delilah", "Byte", "Raze Ortega", "Pixel", "Volt Sarin", "Circuit",
    "Nova Ash", "Ghostwire", "Kade Voss", "Zero Cool", "Echo Rain",
    "Synth Vale", "Rook Kade", "Vega Nyx",
  ],
};

export function pickRandomName(theme: GameTheme, taken: Set<string>): string {
  const pool = THEME_NAME_POOLS[theme];
  const available = pool.filter((name) => !taken.has(name));

  if (available.length === 0) {
    let n = 1;
    while (taken.has(`Character ${n}`)) n++;
    return `Character ${n}`;
  }

  return available[Math.floor(Math.random() * available.length)];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/jest/bin/jest.js src/__tests__/names.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/game-engine/names.ts src/__tests__/names.test.ts
git commit -m "feat: add theme-based random name pools for Make Playable"
```

---

### Task 2: Random character generation (`planNewCharacters`)

**Goal:** A pure function that drafts theme-legal, balance-aware random characters to fill empty deck slots.

**Files:**
- Create: `src/lib/game-engine/randomize.ts` (this task adds `planNewCharacters` and shared helpers only)
- Modify: `src/types/game.ts` — add `CharacterDraft`
- Test: `src/__tests__/randomize.test.ts`

**Acceptance Criteria:**
- [ ] Returns `[]` when the deck already has 24 characters.
- [ ] Returns exactly `24 - characters.length` drafts otherwise.
- [ ] Every draft has all 11 `GAMEPLAY_TRAITS` defined.
- [ ] `outfitType`/`accessory` are always drawn from that theme's `allowedOutfits`/`allowedAccessories`.
- [ ] No draft reuses a `displayName` already in the deck.
- [ ] Drafts have `referenceImageUrls: []` and no `personId`.

**Verify:** `node node_modules/jest/bin/jest.js src/__tests__/randomize.test.ts` → all tests pass.

**Steps:**

- [ ] **Step 1: Add the `CharacterDraft` type**

In `src/types/game.ts`, add directly below the `Person` type (after line 133):

```ts
export type CharacterDraft = Pick<
  Character,
  "gameSetId" | "displayName" | "referenceImageUrls" | "attributes"
>;
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/__tests__/randomize.test.ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node node_modules/jest/bin/jest.js src/__tests__/randomize.test.ts`
Expected: FAIL — `Cannot find module '@/lib/game-engine/randomize'`

- [ ] **Step 4: Implement `planNewCharacters`**

```ts
// src/lib/game-engine/randomize.ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node node_modules/jest/bin/jest.js src/__tests__/randomize.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/game-engine/randomize.ts src/__tests__/randomize.test.ts src/types/game.ts
git commit -m "feat: draft balance-aware random characters for empty deck slots"
```

---

### Task 3: Duplicate resolution (`resolveDuplicates`)

**Goal:** Resolve critical-similarity pairs among the combined (existing + drafted) 24 characters by mutating only `accessory`/`hat`/`glasses`/`outfitType`/`topColor`, preferring drafted characters as the mutation target, and reporting anything it can't fix.

**Files:**
- Modify: `src/lib/game-engine/randomize.ts` (append `resolveDuplicates`)
- Modify: `src/types/game.ts` — add `CharacterEdit`
- Test: `src/__tests__/randomize.test.ts` (append)

**Acceptance Criteria:**
- [ ] Two identical existing characters get resolved via edits limited to `MUTABLE_TRAITS`.
- [ ] `facialHair`, all hair traits, `eyeColor`, and `expression` are never changed.
- [ ] When a colliding pair includes a draft, the draft is mutated and no `CharacterEdit` is recorded for the existing character.
- [ ] A deck with no critical collisions produces no edits and no unresolved warnings.

**Verify:** `node node_modules/jest/bin/jest.js src/__tests__/randomize.test.ts` → all tests pass.

**Steps:**

- [ ] **Step 1: Add the `CharacterEdit` type**

In `src/types/game.ts`, add directly below `CharacterDraft` (from Task 2):

```ts
export type CharacterEdit = {
  characterId: string;
  displayName: string;
  changes: { trait: keyof CharacterAttributes; from: string; to: string }[];
};
```

- [ ] **Step 2: Write the failing tests**

Append to `src/__tests__/randomize.test.ts`:

```ts
import { resolveDuplicates } from "@/lib/game-engine/randomize";
import type { Character, CharacterDraft } from "@/types/game";

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
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node node_modules/jest/bin/jest.js src/__tests__/randomize.test.ts`
Expected: FAIL — `resolveDuplicates is not a function`

- [ ] **Step 4: Implement `resolveDuplicates`**

Append to `src/lib/game-engine/randomize.ts` (add these imports to the existing import block at the top: `CharacterEdit`, `DeckWarning` from `@/types/game`; `findSimilarPairs`, `computeSimilarityScore`, `SIMILARITY_CRITICAL` from `./similarity`):

```ts
import type { CharacterEdit, DeckWarning } from "@/types/game";
import { findSimilarPairs, computeSimilarityScore, SIMILARITY_CRITICAL } from "./similarity";
```

```ts
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
  const attributes: Record<string, string> = { ...target.attributes };

  for (const trait of MUTABLE_TRAITS) {
    const otherValue = other.attributes[trait] as string;
    if (attributes[trait] !== otherValue) continue; // not shared — mutating it won't reduce similarity

    const pool = poolForTrait(trait, gameSet).filter((v) => v !== otherValue);
    if (pool.length === 0) continue;

    const from = attributes[trait];
    const to = pool[Math.floor(Math.random() * pool.length)];
    attributes[trait] = to;
    changes.push({ trait, from, to });

    const score = computeSimilarityScore(
      toFakeCharacter({ ...target, attributes: attributes as unknown as CharacterAttributes }, gameSet.id),
      toFakeCharacter(other, gameSet.id)
    ).score;

    if (score < SIMILARITY_CRITICAL) {
      return { changes, attributes: attributes as unknown as CharacterAttributes };
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

    const targetIndex = b.kind === "draft" ? bIndex : aIndex;
    const otherIndex = targetIndex === aIndex ? bIndex : aIndex;
    const target = working[targetIndex];
    const other = working[otherIndex];

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
        message: `"${a.displayName}" and "${b.displayName}" are ${pair.similarityScore}% similar and could not be resolved without changing hair or facial features.`,
        affectedCharacterIds: [
          a.kind === "existing" ? a.id : `new:${a.index}`,
          b.kind === "existing" ? b.id : `new:${b.index}`,
        ],
      });
      skipPairKeys.add(pairKey);
    }
  }

  const updatedDrafts = draftCharacters.map((d, index) => {
    const w = working.find(
      (w): w is Extract<WorkingChar, { kind: "draft" }> => w.kind === "draft" && w.index === index
    )!;
    return { ...d, attributes: w.attributes };
  });

  return { updatedDrafts, edits: Array.from(editsByCharId.values()), unresolved };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node node_modules/jest/bin/jest.js src/__tests__/randomize.test.ts`
Expected: PASS (10 tests total — 6 from Task 2 + 4 new)

- [ ] **Step 6: Commit**

```bash
git add src/lib/game-engine/randomize.ts src/__tests__/randomize.test.ts src/types/game.ts
git commit -m "feat: resolve critical similarity collisions via accessory-only edits"
```

---

### Task 4: Combine into `planMakePlayable`

**Goal:** A single entry point that drafts fill-ins, resolves collisions across the full projected 24, and reports whether the result would be playable.

**Files:**
- Modify: `src/lib/game-engine/randomize.ts` (append `planMakePlayable`)
- Modify: `src/types/game.ts` — add `MakePlayablePlan`
- Test: `src/__tests__/randomize.test.ts` (append)

**Acceptance Criteria:**
- [ ] `newCharacters.length + characters.length === 24` after planning (when starting below 24).
- [ ] `willBePlayable` is a boolean reflecting `evaluateDeck()` on the projected final 24.
- [ ] A deck already at 24 with no edits needed returns `newCharacters: []`.
- [ ] A deliberately duplicated deck produces at least one edit.

**Verify:** `node node_modules/jest/bin/jest.js src/__tests__/randomize.test.ts` → all tests pass.

**Steps:**

- [ ] **Step 1: Add the `MakePlayablePlan` type**

In `src/types/game.ts`, add directly below `CharacterEdit` (from Task 3):

```ts
export type MakePlayablePlan = {
  newCharacters: CharacterDraft[];
  edits: CharacterEdit[];
  unresolved: DeckWarning[];
  willBePlayable: boolean;
};
```

- [ ] **Step 2: Write the failing tests**

Append to `src/__tests__/randomize.test.ts`:

```ts
import { planMakePlayable } from "@/lib/game-engine/randomize";

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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node node_modules/jest/bin/jest.js src/__tests__/randomize.test.ts`
Expected: FAIL — `planMakePlayable is not a function`

- [ ] **Step 4: Implement `planMakePlayable`**

Append to `src/lib/game-engine/randomize.ts` (add `evaluateDeck` to the existing `./balance` import so the line reads `import { REQUIRED_DECK_SIZE, evaluateDeck } from "./balance";`, and add `MakePlayablePlan` to the `@/types/game` import):

```ts
export function planMakePlayable(characters: Character[], gameSet: GameSet): MakePlayablePlan {
  const drafts = planNewCharacters(characters, gameSet);
  const { updatedDrafts, edits, unresolved } = resolveDuplicates(characters, drafts, gameSet);

  const editsByCharId = new Map(edits.map((e) => [e.characterId, e]));
  const projectedExisting: Character[] = characters.map((c) => {
    const edit = editsByCharId.get(c.id);
    if (!edit) return c;
    const attributes = { ...c.attributes };
    for (const change of edit.changes) attributes[change.trait] = change.to as never;
    return { ...c, attributes };
  });

  const projectedDrafts: Character[] = updatedDrafts.map((d, i) => ({
    id: `new-${i}`,
    gameSetId: d.gameSetId,
    displayName: d.displayName,
    referenceImageUrls: d.referenceImageUrls,
    attributes: d.attributes,
    createdAt: "",
    updatedAt: "",
  }));

  const report = evaluateDeck([...projectedExisting, ...projectedDrafts]);

  return {
    newCharacters: updatedDrafts,
    edits,
    unresolved,
    willBePlayable: report.isPlayable,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node node_modules/jest/bin/jest.js src/__tests__/randomize.test.ts`
Expected: PASS (14 tests total)

- [ ] **Step 6: Run the full test suite to check nothing else broke**

Run: `node node_modules/jest/bin/jest.js`
Expected: PASS — all existing suites (similarity, balance, prompts, imageStyles) plus the new ones.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game-engine/randomize.ts src/__tests__/randomize.test.ts src/types/game.ts
git commit -m "feat: add planMakePlayable orchestrator"
```

---

### Task 5: Text-only image generation for photo-less characters

**Goal:** Let `/api/characters/[id]/generate` and `GeminiImageProvider` produce an image for a character that has no reference photo, by sending a text-only prompt with forced attribute overrides.

**Files:**
- Modify: `src/lib/image-generation/GeminiImageProvider.ts:11-53`
- Modify: `src/app/api/characters/[id]/generate/route.ts:71-77`
- Modify: `src/lib/game-engine/prompts.ts:201-327` (`generateImagePrompt`)
- Test: `src/__tests__/GeminiImageProvider.test.ts` (new)
- Test: `src/__tests__/prompts.test.ts` (append)

**Acceptance Criteria:**
- [ ] `GeminiImageProvider.generateImage(prompt, [])` no longer throws; sends only the text part to Gemini.
- [ ] `GeminiImageProvider.generateImage(prompt, [url])` behaves exactly as before (text + one image part).
- [ ] The generate API route no longer 400s when a character has no reference photos.
- [ ] `generateImagePrompt` forces physical-appearance overrides into the prompt when there's no reference photo, and does not tell the model to use an "attached photo" that doesn't exist.
- [ ] `generateImagePrompt` behavior is unchanged when a reference photo is present.

**Verify:** `node node_modules/jest/bin/jest.js src/__tests__/GeminiImageProvider.test.ts src/__tests__/prompts.test.ts` → all tests pass.

**Steps:**

- [ ] **Step 1: Write the failing `GeminiImageProvider` tests**

```ts
// src/__tests__/GeminiImageProvider.test.ts
import { GeminiImageProvider } from "@/lib/image-generation/GeminiImageProvider";

const mockCreate = jest.fn();

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    interactions: { create: mockCreate },
  })),
}));

describe("GeminiImageProvider — generateImage", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      output_image: { data: "ZmFrZS1pbWFnZS1kYXRh", mime_type: "image/png" },
    });
  });

  it("sends only the text part when referenceImageUrls is empty", async () => {
    const provider = new GeminiImageProvider("fake-key");
    const result = await provider.generateImage("a text-only prompt", []);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];
    expect(call.input).toHaveLength(1);
    expect(call.input[0]).toEqual({ type: "text", text: "a text-only prompt" });
    expect(result.imageData).toBe("ZmFrZS1pbWFnZS1kYXRh");
  });

  it("does not throw when referenceImageUrls is empty", async () => {
    const provider = new GeminiImageProvider("fake-key");
    await expect(provider.generateImage("prompt", [])).resolves.toBeDefined();
  });

  it("sends a text part and an image part per reference URL", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      headers: { get: () => "image/jpeg" },
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new GeminiImageProvider("fake-key");
    await provider.generateImage("prompt", ["https://example.com/ref.jpg"]);

    const call = mockCreate.mock.calls[0][0];
    expect(call.input).toHaveLength(2);
    expect(call.input[0]).toEqual({ type: "text", text: "prompt" });
    expect(call.input[1]).toMatchObject({ type: "image", mime_type: "image/jpeg" });
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/ref.jpg");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/jest/bin/jest.js src/__tests__/GeminiImageProvider.test.ts`
Expected: FAIL — "At least one reference image URL is required" thrown in the first two tests.

- [ ] **Step 3: Relax `GeminiImageProvider.generateImage`**

In `src/lib/image-generation/GeminiImageProvider.ts`, remove the guard at lines 15-17:

```ts
    if (referenceImageUrls.length === 0) {
      throw new Error("At least one reference image URL is required");
    }

```

Update the comment above the `imageParts` block (line 19) from `// Fetch each reference image and convert to base64 inline data` to:

```ts
    // Fetch each reference image and convert to base64 inline data.
    // An empty array is valid — Gemini generates from the text prompt alone.
```

No other change needed in this file — `imageParts` already resolves to `[]` for an empty input array via `Promise.all([].map(...))`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/jest/bin/jest.js src/__tests__/GeminiImageProvider.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Remove the reference-photo requirement from the API route**

In `src/app/api/characters/[id]/generate/route.ts`, delete lines 71-77:

```ts
  // 2. Validate reference images
  if (character.referenceImageUrls.length === 0) {
    return NextResponse.json(
      { error: "Upload at least one reference photo first" },
      { status: 400 }
    );
  }

```

Renumber the surrounding step comments (`// 3. Fetch game set` etc. shift up by one) is optional and not required for correctness — leave as-is unless doing so is trivial.

- [ ] **Step 6: Write the failing `generateImagePrompt` tests**

Append to `src/__tests__/prompts.test.ts` (also update the import on line 1 to include `generateImagePrompt`):

```ts
import { generateCharacterPrompt, generateAllPrompts, generateImagePrompt } from "@/lib/game-engine/prompts";
```

```ts
describe("generateImagePrompt — text-only characters (no reference photo)", () => {
  it("does not reference an attached photo when there are no reference images", () => {
    const char: Character = { ...MOCK_CHARACTERS[0], referenceImageUrls: [] };
    const prompt = generateImagePrompt(char, MOCK_GAME_SET);
    expect(prompt.toLowerCase()).not.toContain("use the attached photo");
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
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `node node_modules/jest/bin/jest.js src/__tests__/prompts.test.ts`
Expected: FAIL — the no-photo tests fail because `generateImagePrompt` still unconditionally includes the "attached photo" line and only applies overrides when the `includePhysicalOverrides` argument is `true`.

- [ ] **Step 8: Update `generateImagePrompt`**

In `src/lib/game-engine/prompts.ts`, inside `generateImagePrompt` (starting line 201), add a `hasReferencePhoto` check right after the destructure on line 207:

```ts
  const themeConfig = getThemeConfig(gameSet.theme);
  const { attributes, displayName } = character;
  const hasReferencePhoto = character.referenceImageUrls.length > 0;
  const applyPhysicalOverrides = includePhysicalOverrides || !hasReferencePhoto;
```

Change the override block's condition (line 268) from `if (includePhysicalOverrides) {` to:

```ts
  if (applyPhysicalOverrides) {
```

Replace the unconditional `VISUAL REFERENCE` line inside the final `return [...]` array (line 319) with a computed line. Add this right before the `return [` statement:

```ts
  const visualReferenceLine = hasReferencePhoto
    ? `VISUAL REFERENCE: Use the attached photo as the appearance reference. Match the hair colour, hair style, skin tone, eye colour, and general face shape shown in the photo.`
    : `VISUAL REFERENCE: No reference photo is provided — invent the character's full appearance strictly from the details below.`;

```

Then change line 319 from the literal string to `visualReferenceLine`:

```ts
  return [
    compositionBlock,
    ``,
    `THEME: ${themeConfig.promptThemeInstruction}`,
    ``,
    visualReferenceLine,
    physicalBlock,
    ``,
    `CHARACTER NAME: ${displayName}`,
    ``,
    `OUTFIT: The character is wearing a ${outfit}.`,
    accessoriesBlock,
  ].join("\n");
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `node node_modules/jest/bin/jest.js src/__tests__/prompts.test.ts`
Expected: PASS (all existing tests + 4 new ones)

- [ ] **Step 10: Run the full test suite**

Run: `node node_modules/jest/bin/jest.js`
Expected: PASS — no regressions in any suite.

- [ ] **Step 11: Commit**

```bash
git add src/lib/image-generation/GeminiImageProvider.ts src/app/api/characters/[id]/generate/route.ts src/lib/game-engine/prompts.ts src/__tests__/GeminiImageProvider.test.ts src/__tests__/prompts.test.ts
git commit -m "feat: support text-only image generation for photo-less characters"
```

---

### Task 6: `MakePlayableModal` component

**Goal:** A preview modal that renders a `MakePlayablePlan` and lets the user confirm or cancel.

**Files:**
- Create: `src/components/game-sets/MakePlayableModal.tsx`

**Acceptance Criteria:**
- [ ] Shows a headline reflecting `plan.willBePlayable` and `plan.unresolved.length`.
- [ ] Lists every drafted new character with its name and non-"none" attribute values.
- [ ] Lists every edit with a `trait: from → to` line per change, grouped by character.
- [ ] Lists unresolved warnings when present.
- [ ] Confirm/Cancel buttons call `onConfirm`/`onCancel`; both are disabled while `isApplying` is true.

**Verify:** No automated test — this codebase has no component test harness (no `@testing-library/react`, confirmed absent from `package.json`; `PeoplePanel`/`PersonForm`/`CharacterEditor` also have none). Verified visually in Task 7's manual check instead.

**Steps:**

- [ ] **Step 1: Implement the component**

```tsx
// src/components/game-sets/MakePlayableModal.tsx
"use client";

import type { CharacterAttributes, MakePlayablePlan } from "@/types/game";

const TRAIT_LABELS: Record<string, string> = {
  hairLength: "hair length",
  hairColor: "hair colour",
  hairTexture: "hair texture",
  facialHair: "facial hair",
  glasses: "glasses",
  hat: "hat",
  eyeColor: "eye colour",
  expression: "expression",
  topColor: "top colour",
  outfitType: "outfit",
  accessory: "accessory",
};

function AttributeChips({ attributes }: { attributes: CharacterAttributes }) {
  const chips = Object.entries(attributes)
    .filter(([, value]) => value && value !== "none")
    .map(([trait, value]) => `${TRAIT_LABELS[trait] ?? trait}: ${value}`);

  return (
    <p className="text-xs text-gray-500">
      {chips.length > 0 ? chips.join(" · ") : "no distinguishing accessories"}
    </p>
  );
}

export default function MakePlayableModal({
  plan,
  onConfirm,
  onCancel,
  isApplying,
}: {
  plan: MakePlayablePlan;
  onConfirm: () => void;
  onCancel: () => void;
  isApplying: boolean;
}) {
  const remaining = plan.unresolved.length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-5">
        <h2 className="text-lg font-bold mb-1">Make Playable</h2>
        <p className={`text-sm mb-4 ${plan.willBePlayable ? "text-green-400" : "text-yellow-400"}`}>
          {plan.willBePlayable
            ? "This will make the deck playable."
            : remaining > 0
            ? `This will improve the deck, but ${remaining} collision${remaining === 1 ? "" : "s"} will remain unresolved.`
            : "This will improve the deck, but it may not reach the playable threshold."}
        </p>

        {plan.newCharacters.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              New characters ({plan.newCharacters.length})
            </h3>
            <ul className="space-y-1.5">
              {plan.newCharacters.map((char, i) => (
                <li key={i} className="text-sm bg-gray-800 rounded px-2.5 py-1.5">
                  <span className="font-medium">{char.displayName}</span>
                  <AttributeChips attributes={char.attributes} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.edits.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Adjusted characters ({plan.edits.length})
            </h3>
            <ul className="space-y-1.5">
              {plan.edits.map((edit) => (
                <li key={edit.characterId} className="text-sm bg-gray-800 rounded px-2.5 py-1.5">
                  <span className="font-medium">{edit.displayName}</span>
                  <p className="text-xs text-gray-500">
                    {edit.changes
                      .map((c) => `${TRAIT_LABELS[c.trait] ?? c.trait}: ${c.from} → ${c.to}`)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {remaining > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Unresolved ({remaining})</h3>
            <ul className="space-y-1.5">
              {plan.unresolved.map((warning, i) => (
                <li key={i} className="text-xs text-yellow-500 bg-yellow-950/40 rounded px-2.5 py-1.5">
                  {warning.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            disabled={isApplying}
            className="text-sm border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isApplying}
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            {isApplying ? "Applying…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors related to `MakePlayableModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/game-sets/MakePlayableModal.tsx
git commit -m "feat: add MakePlayableModal preview component"
```

---

### Task 7: Wire Make Playable into the game set editor page

**Goal:** Add the "Make Playable" button, plan state, and confirm handler to `src/app/game-sets/[id]/page.tsx`, persisting the plan and generating images for new characters.

**Files:**
- Modify: `src/app/game-sets/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] "Make Playable" button appears in the header button row only when `isPlayable === false`.
- [ ] Clicking it computes and shows a `MakePlayableModal` with the current plan.
- [ ] Cancel closes the modal with no side effects.
- [ ] Confirm creates the new characters, applies edits to existing characters, runs image generation for the new characters, re-evaluates and saves the balance report, then closes the modal.

**Verify:** Manual — see Step 6 below (no test harness exists for page components in this codebase; `page.tsx` has no existing test file to extend).

**Steps:**

- [ ] **Step 1: Add imports**

In `src/app/game-sets/[id]/page.tsx`, update the type import on line 17 to include `MakePlayablePlan`:

```ts
import type { GameSet, Character, CharacterAttributes, ImageStyle, Person, MakePlayablePlan } from "@/types/game";
```

Add two new imports directly after the `PeoplePanel` import (line 22):

```ts
import MakePlayableModal from "@/components/game-sets/MakePlayableModal";
import { planMakePlayable } from "@/lib/game-engine/randomize";
```

- [ ] **Step 2: Add state**

After the existing `people` state declaration (line 48), add:

```ts
  const [makePlayablePlan, setMakePlayablePlan] = useState<MakePlayablePlan | null>(null);
  const [isApplyingPlan, setIsApplyingPlan] = useState(false);
```

- [ ] **Step 3: Add handlers**

After `handleUnassignPerson` (ends at line 226) and before the `if (loading)` guard (line 228), add:

```ts
  function handleOpenMakePlayable() {
    if (!gameSet) return;
    setMakePlayablePlan(planMakePlayable(characters, gameSet));
  }

  function handleCancelMakePlayable() {
    setMakePlayablePlan(null);
  }

  async function handleConfirmMakePlayable() {
    if (!makePlayablePlan || !gameSet) return;
    setIsApplyingPlan(true);

    const created: Character[] = [];
    for (const draft of makePlayablePlan.newCharacters) {
      const char = await createCharacter({
        gameSetId: id,
        displayName: draft.displayName,
        attributes: draft.attributes,
      });
      created.push(char);
    }

    const updatedExisting = characters.map((c) => {
      const edit = makePlayablePlan.edits.find((e) => e.characterId === c.id);
      if (!edit) return c;
      const attrs = { ...c.attributes };
      for (const change of edit.changes) attrs[change.trait] = change.to as never;
      return { ...c, attributes: attrs };
    });

    for (const edit of makePlayablePlan.edits) {
      const merged = updatedExisting.find((c) => c.id === edit.characterId)!;
      await updateCharacter(edit.characterId, { attributes: merged.attributes });
    }

    const allCharacters = [...updatedExisting, ...created];
    setCharacters(allCharacters);
    setMakePlayablePlan(null);

    await runGenerationLoop(created);

    runBalance(allCharacters);
    await saveBalanceReport(id, evaluateDeck(allCharacters));
    setIsApplyingPlan(false);
  }
```

- [ ] **Step 4: Add the button**

In the header button row (after the "Generate All" button block, which ends at line 276, and before the "+ Add Character" button), add:

```tsx
            {isPlayable === false && (
              <button
                onClick={handleOpenMakePlayable}
                className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded transition-colors"
              >
                Make Playable
              </button>
            )}
```

- [ ] **Step 5: Render the modal**

Right before the final closing `</div>` of the component's `return` statement (line 376, the one closing the top-level `flex gap-6` container), add:

```tsx
      {makePlayablePlan && (
        <MakePlayableModal
          plan={makePlayablePlan}
          onConfirm={handleConfirmMakePlayable}
          onCancel={handleCancelMakePlayable}
          isApplying={isApplyingPlan}
        />
      )}
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev`

1. Open a game set with fewer than 24 characters (or create one and add a few via "+ Add Character").
2. Confirm the "Make Playable" button appears next to "Generate All".
3. Click it — confirm the modal opens showing the correct count of new characters (with theme-appropriate names and non-"none" attribute chips) and, if any duplicates were present, an "Adjusted characters" section.
4. Click Cancel — confirm the modal closes and the character grid is unchanged.
5. Click "Make Playable" again, then Confirm — confirm the grid fills to 24 characters.
6. If `GOOGLE_AI_API_KEY` is configured in the environment, confirm the new characters each get a `generatedImageUrl` (spinner then a rendered image on their cards, reusing the existing "Generate All" progress UI). If the key isn't configured, confirm generation fails gracefully per-character (existing "Retry failed" affordance still appears) without blocking the rest of the flow.
7. Confirm the balance badge updates to reflect the final `isPlayable` state.

- [ ] **Step 7: Full test suite regression check**

Run: `node node_modules/jest/bin/jest.js`
Expected: PASS — all suites green.

- [ ] **Step 8: Commit**

```bash
git add src/app/game-sets/[id]/page.tsx
git commit -m "feat: wire Make Playable button and flow into game set editor"
```

---

## Task Dependency Order

1. Task 1 (names) — no dependencies
2. Task 2 (planNewCharacters) — depends on Task 1
3. Task 3 (resolveDuplicates) — depends on Task 2 (same file, shared helpers)
4. Task 4 (planMakePlayable) — depends on Task 3
5. Task 5 (text-only generation) — no dependency on Tasks 1-4, can run any time after project setup
6. Task 6 (MakePlayableModal) — depends on Task 4 (needs `MakePlayablePlan` type)
7. Task 7 (page wiring) — depends on Tasks 4, 5, and 6
