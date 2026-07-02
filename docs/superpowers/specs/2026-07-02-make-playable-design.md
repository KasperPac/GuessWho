# Make Playable Design

## Goal

One-click action in the game set editor that gets a deck to `isPlayable: true` without touching any existing character's hair or facial likeness: fill empty slots (below 24) with fully randomized new characters, then resolve any remaining critical similarity collisions by adjusting only accessory-like fields (glasses, hat, accessory, outfitType, topColor) on existing characters. Shows a preview of the plan before applying anything.

## Architecture

Two new pure functions in `src/lib/game-engine/` compute a `MakePlayablePlan` from the current deck (no side effects, no randomness leaking into balance.ts). A new `MakePlayableModal` component renders that plan and, on confirm, the game set editor page persists it using the existing `createCharacter`/`updateCharacter` DB helpers and the existing per-character image-generation loop pattern. Two small existing files (`GeminiImageProvider.ts`, the generate API route, `prompts.ts`) are relaxed to support generating an image for a character with no reference photo, since new fill-in characters won't have one.

## Tech Stack

Next.js App Router, React, TypeScript, Supabase — no new tables, no new API routes, no new packages.

---

## Data Flow

```
[Make Playable button click]
        │
        ▼
planMakePlayable(characters, gameSet)   ── pure, client-side
        │
        ├─ planNewCharacters()   → draft Character[] for empty slots
        ├─ resolveDuplicates()   → { characterId, changes[] }[] + unresolved DeckWarning[]
        │
        ▼
MakePlayableModal shows plan, user clicks Confirm
        │
        ▼
page.tsx:
  1. createCharacter() for each draft            → real ids
  2. updateCharacter() for each edit
  3. runGenerationLoop() over the new characters  → generatedImageUrl (text-only)
  4. evaluateDeck() + saveBalanceReport()
```

---

## New file: `src/lib/game-engine/names.ts`

A per-theme name pool so random fill-in characters fit the deck's theme instead of generic office names showing up in a pirate deck.

```ts
export const THEME_NAME_POOLS: Record<GameTheme, string[]>;
export function pickRandomName(theme: GameTheme, taken: Set<string>): string;
```

- ~30 names per theme (8 themes × 30 ≈ enough headroom for 24 slots + collisions).
- `pickRandomName` filters out names already present in `taken` (existing `displayName`s in the deck) before picking; falls back to `"Character N"` if a pool is exhausted (should not happen in practice with 30 names for ≤24 slots).

---

## New file: `src/lib/game-engine/randomize.ts`

Pure, no DB/network access. Two exported functions plus internal helpers.

### `planNewCharacters(characters: Character[], gameSet: GameSet): Character[]`

For each empty slot (`24 - characters.length`, if positive):

1. Pick a name via `pickRandomName(gameSet.theme, takenNames)`.
2. For each of the 11 `GAMEPLAY_TRAITS`, pick a value:
   - `outfitType` / `accessory`: drawn only from `getThemeConfig(gameSet.theme).allowedOutfits` / `.allowedAccessories`.
   - All other traits: drawn from the full global enum list in `attributes.ts` (`HAIR_LENGTHS`, `GLASSES`, etc. — no theme restriction exists for these today).
   - Selection is weighted: maintain a running `Map<trait, Map<value, count>>` seeded from the existing characters and updated as each new draft is picked, and bias `Math.random()`-based selection away from values already at/above `IDEAL_TRAIT_RANGE.idealHigh` (from `attributes.ts`) for that trait. This is a soft nudge, not a hard constraint — it does not guarantee a passing distribution score, it just avoids obviously making things worse.
3. Return a draft `Character`-shaped object (no `id`/timestamps yet — those come from `createCharacter()`), with `referenceImageUrls: []`, no `personId`.

### `resolveDuplicates(characters: Character[], gameSet: GameSet): { edits: CharacterEdit[]; unresolved: DeckWarning[] }`

Where `characters` is the full 24 (existing + drafted fill-ins from `planNewCharacters`, drafts temporarily given placeholder ids so pairs can reference them). Returns the `CharacterEdit`/`DeckWarning` types defined below under Types.

Only these traits are ever mutated: `glasses`, `hat`, `accessory`, `outfitType`, `topColor` ("MUTABLE_TRAITS"). Never `facialHair`, hair fields, `eyeColor`, or `expression`.

Algorithm (bounded loop, `MAX_ITERATIONS = 50`):

1. `findSimilarPairs(characters, SIMILARITY_CRITICAL)` (reused from `similarity.ts`, threshold 80 already exported).
2. If empty, stop.
3. Take the highest-scoring pair. Pick the member to mutate: prefer a drafted fill-in character (any `MUTABLE_TRAITS` value is fair game there, but for consistency this function only ever touches `MUTABLE_TRAITS` on both drafts and existing characters — new characters got their *other* traits from step 1's full randomization already); if both members are existing characters, mutate the second one (stable, deterministic).
4. Try each `MUTABLE_TRAITS` field on the chosen character, in weight order (`accessory`/`hat`/`glasses` first, since those carry the highest `TRAIT_WEIGHTS`), picking a theme-legal replacement value that differs from the other pair member's value in that field and isn't already the character's current value. Apply the first change that drops the pair's `computeSimilarityScore` below `SIMILARITY_CRITICAL`; record it as a `CharacterEdit` entry (merging into an existing entry for that character if one exists this run).
5. If no single-field change resolves it, try a second field the same way (still same character, cumulative).
6. If still unresolved after trying all `MUTABLE_TRAITS` fields, push a `DeckWarning` (`severity: "critical"`, referencing both character ids) to `unresolved` and remove this exact pair from further consideration (so the loop doesn't spin on it), then continue to the next pair.
7. Repeat from step 1 (re-running `findSimilarPairs` on the current, possibly-edited character list) until no critical pairs remain, all remaining pairs are in `unresolved`, or `MAX_ITERATIONS` is hit (safety net — push any still-critical pairs to `unresolved` and stop).

This only targets critical *similarity* pairs. It does not attempt to fix distribution-only critical warnings (e.g. "too few characters have glasses") on existing characters — per design decision, existing characters are only touched to break duplicate collisions, not to chase a higher balance score.

### `planMakePlayable(characters: Character[], gameSet: GameSet): MakePlayablePlan`

Combines both: drafts fill-ins, appends them to the working list, runs `resolveDuplicates` over the combined 24, and returns:

```ts
type MakePlayablePlan = {
  newCharacters: Character[];       // drafts, no id yet
  edits: CharacterEdit[];           // existing characters only
  unresolved: DeckWarning[];
  willBePlayable: boolean;          // evaluateDeck() on the final projected 24, isPlayable
};
```

`willBePlayable` is computed by applying `newCharacters` + `edits` to a projected in-memory character list and calling the existing `evaluateDeck()` — this is what the modal shows as the headline result ("This will make the deck playable" vs "This will improve the deck but N unresolved collisions will remain").

---

## Types (`src/types/game.ts`)

Add:

```ts
export type CharacterEdit = {
  characterId: string;
  displayName: string;
  changes: { trait: keyof CharacterAttributes; from: string; to: string }[];
};

export type MakePlayablePlan = {
  newCharacters: Character[];
  edits: CharacterEdit[];
  unresolved: DeckWarning[];
  willBePlayable: boolean;
};
```

---

## Image generation changes (support text-only generation)

New fill-in characters have no reference photo, so the existing photo-conditioned pipeline needs to accept an empty `referenceImageUrls`.

### `src/lib/image-generation/GeminiImageProvider.ts`

Remove the `if (referenceImageUrls.length === 0) throw ...` guard (lines 15-17). Build the `input` array conditionally:

```ts
const imageParts = referenceImageUrls.length > 0
  ? await Promise.all(referenceImageUrls.map(...))  // existing logic
  : [];

const interaction = await this.ai.interactions.create({
  model: "gemini-3-pro-image",
  input: [{ type: "text", text: prompt }, ...imageParts],
  response_modalities: ["image"],
});
```

### `src/app/api/characters/[id]/generate/route.ts`

Remove the 400 response for `character.referenceImageUrls.length === 0` (lines 71-77). No other change needed — `generateImagePrompt` (below) already knows how to build a photo-less prompt.

### `src/lib/game-engine/prompts.ts` — `generateImagePrompt`

When `character.referenceImageUrls.length === 0`:
- Force `includePhysicalOverrides = true` regardless of the passed-in argument, so hair/eyes/facial-hair/expression are specified in text (there's no photo to source them from).
- Omit the `VISUAL REFERENCE: Use the attached photo...` line (it's currently unconditional at line 319) — replace it with nothing, or a neutral line only when a photo *is* present.

Known side effect: this also unblocks the manual "Generate" button for any pre-existing character that has no reference photo (previously a hard error). Accepted as an intentional byproduct, not gated specifically to Make-Playable-created characters.

---

## Component: `src/components/game-sets/MakePlayableModal.tsx`

Props:
```ts
{
  plan: MakePlayablePlan;
  onConfirm: () => void;   // page.tsx already has the plan; this just signals "go"
  onCancel: () => void;
  isApplying: boolean;     // disables Confirm + shows a spinner during persistence/generation
}
```

Renders:
- Headline: "Will make this deck playable" (green) or "Will resolve N/M collisions — Y will remain" (amber) based on `plan.willBePlayable` / `plan.unresolved.length`.
- Section "New characters (N)": each drafted character as a compact card — name + a chip row of its non-"none" attributes (reuses the visual style of `CharacterCard`'s attribute chips if any exist, otherwise plain text list).
- Section "Adjusted characters (M)": each `CharacterEdit` as `{displayName}: {trait} {from} → {to}` lines, grouped per character.
- Section "Unresolved (Y)" (only if non-empty): plain-text list of the warning messages, framed as "you may want to adjust these manually."
- Footer: Cancel / Confirm buttons.

---

## Game Set Editor Page (`src/app/game-sets/[id]/page.tsx`)

New state:
```ts
const [makePlayablePlan, setMakePlayablePlan] = useState<MakePlayablePlan | null>(null);
const [isApplyingPlan, setIsApplyingPlan] = useState(false);
```

New button in the header button row, next to "Generate All": shown when `isPlayable === false`.
```tsx
{isPlayable === false && (
  <button onClick={() => setMakePlayablePlan(planMakePlayable(characters, gameSet))}>
    Make Playable
  </button>
)}
```

New handler:
```ts
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

  await runGenerationLoop(created); // existing loop, now works with empty referenceImageUrls

  runBalance(allCharacters);
  await saveBalanceReport(id, evaluateDeck(allCharacters));
  setIsApplyingPlan(false);
}
```

`runGenerationLoop` is reused as-is — it already handles per-character progress/failure tracking; it just no longer needs the `referenceImageUrls.length > 0` eligibility filter for these specific characters (that filter stays for the "Generate All" button's own eligibility check, which is about *existing* characters with photos — unrelated to this flow, since `created` characters are passed directly).

---

## End-to-End Flow

1. Deck has 18 characters, `isPlayable: false`. "Make Playable" button appears.
2. User clicks it. `planMakePlayable` runs client-side (no network): drafts 6 themed random characters, checks the projected 24 for critical similarity, and finds 2 critical pairs. It resolves 1 by adjusting an accessory on an existing character; the other stays unresolved because both members are existing characters that only differ in hair, which is off-limits.
3. Modal opens showing: 6 new characters with their random attribute chips, 1 adjusted character with a before→after line, 1 unresolved warning, headline "Will resolve 1/2 collisions — 1 will remain."
4. User clicks Confirm. Modal shows a spinner (`isApplying`).
5. 6 `createCharacter()` calls, 2 `updateCharacter()` calls, then a generation loop over the 6 new characters (text-only Gemini calls, since they have no photos) with per-character progress reusing the existing "Generate All" progress UI pattern.
6. Balance re-evaluated and saved. Grid now shows 24 characters. Badge updates to reflect final `isPlayable` state (may still be `false` if the one unresolved collision alone drops the score below the critical bar — the modal already told the user this would happen).

---

## Out of Scope

- Chasing a maximum balance score — only clears the 24-count critical warning and critical similarity-pair warnings.
- Fixing distribution-only critical warnings (e.g. a binary trait with ≤3 non-"none" characters) by editing existing characters — new fill-ins nudge this but it isn't guaranteed.
- Editing `facialHair`, hair, `eyeColor`, or `expression` on existing characters under any circumstance.
- Any change to `themeTrait1`/`themeTrait2` (free text) on existing or new characters — left blank on new fill-ins.
- A "regenerate this one new character's attributes" affordance in the modal (re-running the whole plan is the only way to get a different randomization).
- Retrying failed image generations from within the Make Playable flow specifically — falls back to the existing "Retry failed" button already on the page, since `generateAllProgress` state is shared.
