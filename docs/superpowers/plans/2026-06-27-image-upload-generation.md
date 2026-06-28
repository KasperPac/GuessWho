# Image Upload & AI Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reference photo upload (1–3 per character) and Gemini-powered portrait generation with 8 selectable image styles to the GuessMate game set editor.

**Architecture:** Browser uploads reference photos directly to Supabase Storage; a Next.js API route fetches them, calls Gemini with a composed prompt + style modifier, uploads the generated portrait back to Storage, and returns the public URL. The game set editor gains a style picker and a Generate All batch button; the CharacterEditor gains a photo upload zone and a per-character Generate button.

**Tech Stack:** Next.js 15 App Router, Supabase JS client v2 (Storage + DB), `@google/genai` SDK, Tailwind CSS, TypeScript strict, Jest/ts-jest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/002_image_style.sql` | Create | Schema: add `image_style` to `game_sets`, add `reference_image_urls` array to `characters`, drop old `reference_image_url` column |
| `src/types/game.ts` | Modify | Add `ImageStyle` union type, update `GameSet`, `Character`, `GeneratedImageResult`, `ImageGenerationProvider` |
| `src/lib/game-engine/mockDeck.ts` | Modify | Add `imageStyle: "pixar"` to `MOCK_GAME_SET` |
| `src/lib/image-generation/styles.ts` | Create | `IMAGE_STYLE_CONFIGS` record with all 8 style configs |
| `src/lib/image-generation/GeminiImageProvider.ts` | Create | Gemini API wrapper — pure, no DB/Storage side-effects |
| `src/app/api/characters/[id]/generate/route.ts` | Create | POST handler: fetch char, build prompt, call Gemini, upload to Storage, update DB |
| `src/lib/supabase/db.ts` | Modify | Update `rowToGameSet`, `rowToCharacter`, `createGameSet`, `updateGameSet`, `createCharacter`, `updateCharacter` |
| `src/components/game-sets/CharacterCard.tsx` | Modify | Add `isGenerating` spinner overlay + green ✓ badge |
| `src/components/game-sets/CharacterEditor.tsx` | Modify | Add photo upload zone, Generate button, wire storage upload |
| `src/app/game-sets/[id]/page.tsx` | Modify | Add style picker, Generate All button, `generatingCharId` state |
| `src/__tests__/imageStyles.test.ts` | Create | Unit tests for `IMAGE_STYLE_CONFIGS` |

---

## Task 1: TypeScript types + mockDeck update

**Goal:** Add `ImageStyle`, update `GameSet` and `Character` types, fix `ImageGenerationProvider` interface, update `MOCK_GAME_SET` — all 47 existing tests still pass.

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/game-engine/mockDeck.ts`

**Acceptance Criteria:**
- [ ] `ImageStyle` union type exported from `src/types/game.ts`
- [ ] `GameSet.imageStyle: ImageStyle` present as required field
- [ ] `Character.referenceImageUrls: string[]` replaces `referenceImageUrl?: string`
- [ ] `GeneratedImageResult` has `imageData: string; mimeType: string` instead of `imageUrl`
- [ ] `ImageGenerationProvider.generateImage` signature uses `referenceImageUrls: string[]`
- [ ] `MOCK_GAME_SET` includes `imageStyle: "pixar"`
- [ ] All 47 tests pass

**Verify:** `npm test` → `Tests: 47 passed`

**Steps:**

- [ ] **Step 1: Update `src/types/game.ts`**

Replace the entire file content:

```ts
// ─── Themes ────────────────────────────────────────────────────────────────

export type GameTheme =
  | "classic_office"
  | "farewell_gift"
  | "remote_team"
  | "drag_royalty"
  | "medieval_knights"
  | "space_rangers"
  | "pirates"
  | "cyberpunk";

// ─── Image Styles ──────────────────────────────────────────────────────────

export type ImageStyle =
  | "cartoon"
  | "realistic"
  | "simpsons"
  | "pixar"
  | "watercolour"
  | "anime"
  | "lego"
  | "southpark";

// ─── Attributes ────────────────────────────────────────────────────────────

export type CharacterAttributes = {
  hairLength: "bald" | "buzz" | "short" | "medium" | "long";
  hairColor:
    | "black"
    | "brown"
    | "blonde"
    | "red"
    | "grey"
    | "white"
    | "dyed"
    | "hidden";
  hairTexture: "straight" | "wavy" | "curly" | "afro" | "none" | "hidden";

  facialHair: "none" | "stubble" | "moustache" | "goatee" | "beard";
  glasses: "none" | "round" | "square" | "sunglasses";
  hat:
    | "none"
    | "cap"
    | "beanie"
    | "helmet"
    | "crown"
    | "cowboy_hat"
    | "wizard_hat";

  eyeColor: "brown" | "blue" | "green" | "hazel" | "grey" | "not_visible";
  expression:
    | "smiling_teeth"
    | "smiling_closed"
    | "neutral"
    | "serious";

  topColor:
    | "red"
    | "blue"
    | "green"
    | "yellow"
    | "black"
    | "white"
    | "purple"
    | "orange";
  outfitType:
    | "tshirt"
    | "shirt"
    | "hoodie"
    | "jacket"
    | "suit"
    | "armour"
    | "spacesuit"
    | "robe"
    | "drag_outfit";
  accessory:
    | "none"
    | "coffee_mug"
    | "laptop"
    | "sword"
    | "shield"
    | "staff"
    | "jetpack"
    | "feather_boa"
    | "microphone";

  themeTrait1?: string;
  themeTrait2?: string;
};

// ─── Entities ──────────────────────────────────────────────────────────────

export type GameSetStatus =
  | "draft"
  | "ready_for_generation"
  | "generating"
  | "ready_for_review"
  | "approved"
  | "exported";

export type GameSet = {
  id: string;
  title: string;
  theme: GameTheme;
  imageStyle: ImageStyle;
  status: GameSetStatus;
  characterCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Character = {
  id: string;
  gameSetId: string;
  displayName: string;
  referenceImageUrls: string[];
  generatedImageUrl?: string;
  attributes: CharacterAttributes;
  prompt?: string;
  balanceWarnings?: string[];
  createdAt: string;
  updatedAt: string;
};

// ─── Balance ───────────────────────────────────────────────────────────────

export type WarningSeverity = "info" | "warning" | "critical";

export type DeckWarning = {
  severity: WarningSeverity;
  message: string;
  affectedCharacterIds?: string[];
  affectedTrait?: string;
};

export type TraitUsefulness = "poor" | "okay" | "good";

export type TraitDistribution = {
  trait: string;
  value: string;
  count: number;
  percentage: number;
  usefulness: TraitUsefulness;
};

export type SimilarCharacterPair = {
  characterAId: string;
  characterBId: string;
  similarityScore: number;
  sharedTraits: string[];
  differingTraits: string[];
};

export type SuggestedFix = {
  characterId: string;
  trait: keyof CharacterAttributes;
  currentValue: string;
  suggestedValue: string;
  reason: string;
};

export type DeckBalanceReport = {
  isPlayable: boolean;
  score: number;
  warnings: DeckWarning[];
  traitDistribution: TraitDistribution[];
  similarPairs: SimilarCharacterPair[];
  suggestedFixes: SuggestedFix[];
};

// ─── Image Generation ──────────────────────────────────────────────────────

export type GeneratedImageResult = {
  imageData: string;  // base64-encoded image bytes (no data URI prefix)
  mimeType: string;   // e.g. "image/jpeg"
  provider: string;
  prompt: string;
};

export interface ImageGenerationProvider {
  generateImage(
    prompt: string,
    referenceImageUrls: string[]
  ): Promise<GeneratedImageResult>;
}
```

- [ ] **Step 2: Update `src/lib/game-engine/mockDeck.ts` — add `imageStyle` to `MOCK_GAME_SET`**

Find the `MOCK_GAME_SET` object and add `imageStyle: "pixar"` (add after `theme`):

```ts
export const MOCK_GAME_SET: GameSet = {
  id: "mock-set-001",
  title: "Classic Office Pack",
  theme: "classic_office",
  imageStyle: "pixar",
  status: "draft",
  characterCount: 24,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};
```

Also update each character in `MOCK_CHARACTERS` to replace `referenceImageUrl` (if it appears) with `referenceImageUrls: []`. Search with: `grep -n "referenceImageUrl" src/lib/game-engine/mockDeck.ts` — if not present, no changes needed to character objects (the type's required `referenceImageUrls` defaults are not needed in object literals if the array is absent — but TypeScript strict mode WILL require it). Add `referenceImageUrls: []` to the first character entry and confirm it compiles, then do the same for all 24.

Actually the cleanest approach: since all mock characters lack reference images, do a find+replace in mockDeck.ts. Each character object currently ends with `updatedAt: "..."`. After adding `referenceImageUrls: string[]` as required, TypeScript will error unless each character has it. Add `referenceImageUrls: [],` to each character — do a targeted search and add to the spread pattern or add it explicitly.

The mock characters do NOT currently have `referenceImageUrl` (checking the file), so no removal is needed. Each character object just needs `referenceImageUrls: [],` added.

Pattern to add to each character entry (after `displayName`):

```ts
// Add this line after displayName in every character object:
referenceImageUrls: [],
```

Use an editor multi-cursor or search/replace: add `referenceImageUrls: [],\n` after every `displayName:` line in mockDeck.ts.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: `Tests: 47 passed, 47 total`

If TypeScript errors appear, they will look like `Property 'imageStyle' is missing in type` — fix by checking Step 2 covered all mock objects.

- [ ] **Step 4: Commit**

```bash
git add src/types/game.ts src/lib/game-engine/mockDeck.ts
git commit -m "feat: add ImageStyle type, update GameSet/Character/ImageGenerationProvider types"
```

---

## Task 2: DB migration + DB service update

**Goal:** Write the SQL migration and update `db.ts` to handle the new `image_style` column on `game_sets` and `reference_image_urls` array on `characters`.

**Files:**
- Create: `supabase/migrations/002_image_style.sql`
- Modify: `src/lib/supabase/db.ts`

**Acceptance Criteria:**
- [ ] Migration SQL file exists and is correct
- [ ] `rowToGameSet` maps `image_style` → `imageStyle`
- [ ] `rowToCharacter` maps `reference_image_urls` → `referenceImageUrls` (array, defaults to `[]`)
- [ ] `createGameSet` accepts optional `imageStyle`, `updateGameSet` accepts `imageStyle`
- [ ] `createCharacter` and `updateCharacter` use `referenceImageUrls`
- [ ] All 47 tests pass

**Verify:** `npm test` → `Tests: 47 passed, 47 total`

**Steps:**

- [ ] **Step 1: Create `supabase/migrations/002_image_style.sql`**

```sql
-- Migration 002: image style on game sets, reference image URLs array on characters
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/yjsdslqvpnezpwvlxmvm/sql/new

alter table game_sets add column image_style text not null default 'pixar';

alter table characters add column reference_image_urls text[] not null default '{}';
alter table characters drop column if exists reference_image_url;
```

**IMPORTANT — MANUAL STEP:** Run this SQL in the Supabase dashboard SQL editor before proceeding to Task 5 (the API route). The editor app will continue working on existing data without errors because `image_style` has a default.

- [ ] **Step 2: Update `rowToGameSet` in `src/lib/supabase/db.ts`**

Replace the `rowToGameSet` function:

```ts
function rowToGameSet(row: Record<string, unknown>): GameSet {
  return {
    id: row.id as string,
    title: row.title as string,
    theme: row.theme as GameSet["theme"],
    imageStyle: (row.image_style as GameSet["imageStyle"]) ?? "pixar",
    status: row.status as GameSet["status"],
    characterCount: row.character_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

- [ ] **Step 3: Update `rowToCharacter` in `src/lib/supabase/db.ts`**

Replace the `rowToCharacter` function:

```ts
function rowToCharacter(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    gameSetId: row.game_set_id as string,
    displayName: row.display_name as string,
    referenceImageUrls: (row.reference_image_urls as string[] | null) ?? [],
    generatedImageUrl: row.generated_image_url as string | undefined,
    attributes: row.attributes as CharacterAttributes,
    prompt: row.prompt as string | undefined,
    balanceWarnings: row.balance_warnings as string[] | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

- [ ] **Step 4: Update `createGameSet` to accept optional `imageStyle`**

Replace the `createGameSet` function:

```ts
export async function createGameSet(
  input: Pick<GameSet, "title" | "theme"> & Partial<Pick<GameSet, "imageStyle">>
): Promise<GameSet> {
  const { data, error } = await supabase
    .from("game_sets")
    .insert({
      title: input.title,
      theme: input.theme,
      ...(input.imageStyle ? { image_style: input.imageStyle } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return rowToGameSet(data);
}
```

- [ ] **Step 5: Update `updateGameSet` to accept `imageStyle` with proper snake_case conversion**

Replace the `updateGameSet` function:

```ts
export async function updateGameSet(
  id: string,
  input: Partial<Pick<GameSet, "title" | "theme" | "status" | "imageStyle">>
): Promise<GameSet> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) patch.title = input.title;
  if (input.theme !== undefined) patch.theme = input.theme;
  if (input.status !== undefined) patch.status = input.status;
  if (input.imageStyle !== undefined) patch.image_style = input.imageStyle;

  const { data, error } = await supabase
    .from("game_sets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return rowToGameSet(data);
}
```

- [ ] **Step 6: Update `createCharacter` to use `referenceImageUrls`**

Replace the `createCharacter` function:

```ts
export async function createCharacter(
  input: Pick<Character, "gameSetId" | "displayName" | "attributes"> &
    Partial<Pick<Character, "referenceImageUrls">>
): Promise<Character> {
  const { data, error } = await supabase
    .from("characters")
    .insert({
      game_set_id: input.gameSetId,
      display_name: input.displayName,
      attributes: input.attributes,
      reference_image_urls: input.referenceImageUrls ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return rowToCharacter(data);
}
```

- [ ] **Step 7: Update `updateCharacter` to use `referenceImageUrls`**

Replace the `updateCharacter` function:

```ts
export async function updateCharacter(
  id: string,
  input: Partial<
    Pick<
      Character,
      | "displayName"
      | "attributes"
      | "referenceImageUrls"
      | "generatedImageUrl"
      | "prompt"
      | "balanceWarnings"
    >
  >
): Promise<Character> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.attributes !== undefined) patch.attributes = input.attributes;
  if (input.referenceImageUrls !== undefined)
    patch.reference_image_urls = input.referenceImageUrls;
  if (input.generatedImageUrl !== undefined)
    patch.generated_image_url = input.generatedImageUrl;
  if (input.prompt !== undefined) patch.prompt = input.prompt;
  if (input.balanceWarnings !== undefined)
    patch.balance_warnings = input.balanceWarnings;

  const { data, error } = await supabase
    .from("characters")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return rowToCharacter(data);
}
```

- [ ] **Step 8: Run tests**

```bash
npm test
```

Expected: `Tests: 47 passed, 47 total`

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/002_image_style.sql src/lib/supabase/db.ts
git commit -m "feat: add image_style migration and update DB service for reference_image_urls"
```

---

## Task 3: Image style config module + tests

**Goal:** Create `src/lib/image-generation/styles.ts` with `IMAGE_STYLE_CONFIGS` for all 8 styles, and unit tests that verify all configs are present and well-formed.

**Files:**
- Create: `src/lib/image-generation/styles.ts`
- Create: `src/__tests__/imageStyles.test.ts`

**Acceptance Criteria:**
- [ ] `IMAGE_STYLE_CONFIGS` exported with exactly 8 keys matching `ImageStyle` union
- [ ] Each config has non-empty `label`, `description`, `promptModifier`
- [ ] 25 new tests added, all passing (47 + 25 = 72 total)

**Verify:** `npm test` → `Tests: 72 passed, 72 total`

**Steps:**

- [ ] **Step 1: Write failing tests first**

Create `src/__tests__/imageStyles.test.ts`:

```ts
import { IMAGE_STYLE_CONFIGS } from "@/lib/image-generation/styles";
import type { ImageStyle } from "@/types/game";

const EXPECTED_STYLES: ImageStyle[] = [
  "cartoon",
  "realistic",
  "simpsons",
  "pixar",
  "watercolour",
  "anime",
  "lego",
  "southpark",
];

describe("IMAGE_STYLE_CONFIGS", () => {
  it("contains exactly 8 styles", () => {
    expect(Object.keys(IMAGE_STYLE_CONFIGS).length).toBe(8);
  });

  for (const style of EXPECTED_STYLES) {
    describe(`style: ${style}`, () => {
      it("has a non-empty label", () => {
        expect(IMAGE_STYLE_CONFIGS[style].label.length).toBeGreaterThan(0);
      });

      it("has a non-empty description", () => {
        expect(IMAGE_STYLE_CONFIGS[style].description.length).toBeGreaterThan(0);
      });

      it("has a non-empty promptModifier", () => {
        expect(IMAGE_STYLE_CONFIGS[style].promptModifier.length).toBeGreaterThan(0);
      });
    });
  }
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=imageStyles
```

Expected: `Cannot find module '@/lib/image-generation/styles'`

- [ ] **Step 3: Create `src/lib/image-generation/styles.ts`**

```ts
import type { ImageStyle } from "@/types/game";

export type ImageStyleConfig = {
  label: string;
  description: string;
  promptModifier: string;
};

export const IMAGE_STYLE_CONFIGS: Record<ImageStyle, ImageStyleConfig> = {
  cartoon: {
    label: "Cartoon",
    description: "Bold outlines, flat colours, exaggerated features.",
    promptModifier:
      "Render in a bold cartoon illustration style with clean outlines, flat vibrant colours, and exaggerated friendly features.",
  },
  realistic: {
    label: "Realistic",
    description: "Photo-like digital portrait.",
    promptModifier:
      "Render as a photorealistic digital portrait with accurate facial likeness, professional studio lighting, and sharp detail.",
  },
  simpsons: {
    label: "Simpsons",
    description: "Yellow skin, overbite, Springfield style.",
    promptModifier:
      "Render in The Simpsons animation style: yellow skin tone, overbite, simple oval eyes, flat colour fills, Springfield aesthetic.",
  },
  pixar: {
    label: "Pixar 3D",
    description: "Warm 3D render, large eyes, friendly proportions.",
    promptModifier:
      "Render in Pixar 3D animation style: warm polished render, large expressive eyes, soft studio lighting, friendly rounded proportions.",
  },
  watercolour: {
    label: "Watercolour",
    description: "Painterly washes, soft edges.",
    promptModifier:
      "Render as a watercolour portrait painting with soft colour washes, painterly brushwork, and slightly loose edges.",
  },
  anime: {
    label: "Anime",
    description: "Large eyes, clean lines, vibrant colours.",
    promptModifier:
      "Render in Japanese anime style: large expressive eyes, clean bold outlines, vibrant colours, high-contrast shading.",
  },
  lego: {
    label: "LEGO Minifigure",
    description: "Blocky yellow figure with printed face.",
    promptModifier:
      "Render as a LEGO minifigure: blocky yellow plastic body, printed facial features, classic LEGO proportions, studio product lighting.",
  },
  southpark: {
    label: "South Park",
    description: "Flat cutout, simple round head.",
    promptModifier:
      "Render in South Park animation style: flat 2D cutout aesthetic, simple round head, construction paper texture, limited colour palette.",
  },
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=imageStyles
```

Expected: `Tests: 25 passed, 25 total`

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: `Tests: 72 passed, 72 total`

- [ ] **Step 6: Commit**

```bash
git add src/lib/image-generation/styles.ts src/__tests__/imageStyles.test.ts
git commit -m "feat: add IMAGE_STYLE_CONFIGS for 8 image styles with tests"
```

---

## Task 4: Install @google/genai + GeminiImageProvider

**Goal:** Install the Google AI SDK and implement `GeminiImageProvider` — the pure Gemini API wrapper that builds a multipart request and returns raw base64 image data.

**Files:**
- Modify: `package.json` (via `npm install`)
- Create: `src/lib/image-generation/GeminiImageProvider.ts`
- Modify: `.env.local` (add `GOOGLE_AI_API_KEY`)

**Manual prerequisite:** Create the `character-images` Supabase Storage bucket before Task 5:
1. Go to Supabase dashboard → Storage → New bucket
2. Name: `character-images`, toggle **Public bucket** ON
3. In SQL editor run:
```sql
create policy "Allow all for anon" on storage.objects
  for all
  using (bucket_id = 'character-images')
  with check (bucket_id = 'character-images');
```

**Acceptance Criteria:**
- [ ] `@google/genai` installed in `node_modules`
- [ ] `GeminiImageProvider` implements `ImageGenerationProvider` interface
- [ ] Returns `GeneratedImageResult` with `imageData` (base64), `mimeType`, `provider: "gemini"`, `prompt`
- [ ] `GOOGLE_AI_API_KEY` env var documented and added to `.env.local`
- [ ] `npm run build` compiles without TypeScript errors

**Verify:** `npm run build` → `✓ Compiled successfully`

**Steps:**

- [ ] **Step 1: Install the SDK**

```bash
npm install @google/genai
```

Expected: `added N packages` (no errors). If SSL errors occur, `npm config set strict-ssl false` is already set; retry.

- [ ] **Step 2: Add API key to `.env.local`**

Append to `.env.local`:

```
GOOGLE_AI_API_KEY=<redacted — see team password manager / Google Cloud Console>
```

(This key was provided during brainstorming. Keep `.env.local` gitignored — confirmed in `.gitignore`.)

- [ ] **Step 3: Create `src/lib/image-generation/GeminiImageProvider.ts`**

```ts
import { GoogleGenAI } from "@google/genai";
import type { ImageGenerationProvider, GeneratedImageResult } from "@/types/game";

export class GeminiImageProvider implements ImageGenerationProvider {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateImage(
    prompt: string,
    referenceImageUrls: string[]
  ): Promise<GeneratedImageResult> {
    // Fetch each reference image and convert to base64 inline data
    const imageParts = await Promise.all(
      referenceImageUrls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch reference image: ${url}`);
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = res.headers.get("content-type") ?? "image/jpeg";
        return { inlineData: { data: base64, mimeType } };
      })
    );

    const contents = [
      {
        parts: [
          { text: prompt },
          ...imageParts,
        ],
      },
    ];

    const response = await this.ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents,
      config: {
        responseModalities: ["IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart?.inlineData) {
      throw new Error("Gemini returned no image in response");
    }

    return {
      imageData: imagePart.inlineData.data ?? "",
      mimeType: imagePart.inlineData.mimeType ?? "image/jpeg",
      provider: "gemini",
      prompt,
    };
  }
}
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
npm run build
```

Expected: `✓ Compiled successfully` (or equivalent Next.js build success). Fix any type errors before proceeding.

If `@google/genai` types differ from above (e.g., `config` key differs), check the installed package's type definitions:

```bash
cat node_modules/@google/genai/dist/index.d.ts | head -100
```

Adjust the call signature to match the actual SDK types.

- [ ] **Step 5: Commit**

```bash
git add src/lib/image-generation/GeminiImageProvider.ts package.json package-lock.json
git commit -m "feat: add GeminiImageProvider wrapping gemini-2.0-flash-preview-image-generation"
```

---

## Task 5: Generate API route

**Goal:** Implement `POST /api/characters/[id]/generate` — validates the character has reference images, builds the styled prompt, calls Gemini, uploads the result to Supabase Storage, updates the DB, and returns the public URL.

**Files:**
- Create: `src/app/api/characters/[id]/generate/route.ts`

**Acceptance Criteria:**
- [ ] Returns `400` if character has no reference image URLs
- [ ] Returns `{ generatedImageUrl: string }` on success
- [ ] Retries once after 2 s on Gemini 429, returns `500` after retry
- [ ] Uploads generated image to `character-images/{gameSetId}/{charId}/generated.jpg`
- [ ] Updates `characters.generated_image_url` in DB
- [ ] `npm run build` compiles without errors

**Verify:** `npm run build` → `✓ Compiled successfully`

**Steps:**

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/app/api/characters/\[id\]/generate
```

On Windows with bash: `mkdir -p "src/app/api/characters/[id]/generate"`

- [ ] **Step 2: Create `src/app/api/characters/[id]/generate/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getCharacter, getGameSet, updateCharacter } from "@/lib/supabase/db";
import { supabase } from "@/lib/supabase/client";
import { generateCharacterPrompt } from "@/lib/game-engine/prompts";
import { IMAGE_STYLE_CONFIGS } from "@/lib/image-generation/styles";
import { GeminiImageProvider } from "@/lib/image-generation/GeminiImageProvider";
import type { ImageStyle } from "@/types/game";

const provider = new GeminiImageProvider(process.env.GOOGLE_AI_API_KEY!);

async function callGemini(prompt: string, referenceImageUrls: string[]) {
  return provider.generateImage(prompt, referenceImageUrls);
}

async function callGeminiWithRetry(prompt: string, referenceImageUrls: string[]) {
  try {
    return await callGemini(prompt, referenceImageUrls);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Retry once on 429 rate limit
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return await callGemini(prompt, referenceImageUrls);
    }
    throw err;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: charId } = await params;

  let body: { gameSetId: string; imageStyle: ImageStyle };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { gameSetId, imageStyle } = body;

  // 1. Fetch character
  const character = await getCharacter(charId);
  if (!character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  // 2. Validate reference images
  if (character.referenceImageUrls.length === 0) {
    return NextResponse.json(
      { error: "Upload at least one reference photo first" },
      { status: 400 }
    );
  }

  // 3. Fetch game set
  const gameSet = await getGameSet(gameSetId);
  if (!gameSet) {
    return NextResponse.json({ error: "Game set not found" }, { status: 404 });
  }

  // 4. Build prompt: base prompt + style modifier
  const basePrompt = generateCharacterPrompt(character, gameSet);
  const styleModifier = IMAGE_STYLE_CONFIGS[imageStyle].promptModifier;
  const fullPrompt = `${basePrompt}\n\nStyle instruction: ${styleModifier}`;

  // 5. Call Gemini
  let result;
  try {
    result = await callGeminiWithRetry(fullPrompt, character.referenceImageUrls);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown Gemini error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // 6. Upload generated image to Supabase Storage
  const storagePath = `${gameSetId}/${charId}/generated.jpg`;
  const imageBuffer = Buffer.from(result.imageData, "base64");

  const { error: uploadError } = await supabase.storage
    .from("character-images")
    .upload(storagePath, imageBuffer, {
      contentType: result.mimeType,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // 7. Get public URL
  const { data: urlData } = supabase.storage
    .from("character-images")
    .getPublicUrl(storagePath);

  const generatedImageUrl = urlData.publicUrl;

  // 8. Update character in DB
  await updateCharacter(charId, { generatedImageUrl });

  // 9. Return URL
  return NextResponse.json({ generatedImageUrl });
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

Common issue: `supabase` client is created with `process.env.NEXT_PUBLIC_*` vars in a client component context. In an API route (server-side), using the same client is fine — Next.js resolves `NEXT_PUBLIC_*` on both client and server. No change needed.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/characters/[id]/generate/route.ts"
git commit -m "feat: add POST /api/characters/[id]/generate route"
```

---

## Task 6: CharacterCard — spinner overlay + generated badge

**Goal:** Update `CharacterCard` to show a spinner overlay when `isGenerating` is true, and a green ✓ badge when `generatedImageUrl` is present.

**Files:**
- Modify: `src/components/game-sets/CharacterCard.tsx`

**Acceptance Criteria:**
- [ ] Accepts optional `isGenerating?: boolean` prop
- [ ] Shows animated spinner overlay (covers image area) when `isGenerating` is true
- [ ] Shows green dot badge in top-right corner when `generatedImageUrl` is non-null
- [ ] Uses `referenceImageUrls[0]` as fallback image (not old `referenceImageUrl`)
- [ ] All 72 tests pass

**Verify:** `npm test` → `Tests: 72 passed, 72 total`

**Steps:**

- [ ] **Step 1: Replace `src/components/game-sets/CharacterCard.tsx`**

```tsx
"use client";

import type { Character } from "@/types/game";

export default function CharacterCard({
  character,
  selected,
  isGenerating = false,
  onClick,
}: {
  character: Character;
  selected: boolean;
  isGenerating?: boolean;
  onClick: () => void;
}) {
  const { attributes, displayName, generatedImageUrl, referenceImageUrls } = character;
  const imageUrl = generatedImageUrl ?? referenceImageUrls[0];

  return (
    <button
      onClick={onClick}
      className={`aspect-[3/4] rounded-xl border-2 overflow-hidden flex flex-col transition-all text-left relative ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-500/30"
          : "border-gray-800 hover:border-gray-600"
      }`}
    >
      {/* Image area */}
      <div className="flex-1 bg-gray-800 flex items-center justify-center text-gray-600 text-xs overflow-hidden relative">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">👤</span>
        )}

        {/* Spinner overlay during generation */}
        {isGenerating && (
          <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Generated badge */}
        {generatedImageUrl && !isGenerating && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
        )}
      </div>

      {/* Name + key trait */}
      <div className="bg-gray-900 px-2 py-1.5">
        <p className="text-xs font-medium truncate">{displayName}</p>
        <p className="text-xs text-gray-500 truncate">
          {attributes.hairLength} · {attributes.hairColor} ·{" "}
          {attributes.glasses !== "none" ? "glasses" : "no glasses"}
        </p>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: `Tests: 72 passed, 72 total`

- [ ] **Step 3: Commit**

```bash
git add src/components/game-sets/CharacterCard.tsx
git commit -m "feat: add generation spinner overlay and badge to CharacterCard"
```

---

## Task 7: CharacterEditor — photo upload zone + Generate button

**Goal:** Add a photo upload zone (click-to-pick or drag-and-drop, max 3 images) and a Generate button to `CharacterEditor`. Uploads go directly to Supabase Storage; URLs saved to `character.referenceImageUrls` via `updateCharacter`. Generate button calls the API route.

**Files:**
- Modify: `src/components/game-sets/CharacterEditor.tsx`

**Acceptance Criteria:**
- [ ] Upload zone accepts image files, enforces max 3
- [ ] On file select: uploads to `character-images/{gameSetId}/{charId}/ref-{index}.jpg`, saves URL
- [ ] Thumbnails shown with × remove button (remove clears from state only — not from Storage for MVP)
- [ ] Generate button disabled with tooltip when `referenceImageUrls.length === 0`
- [ ] Generate button shows spinner, calls `POST /api/characters/[id]/generate`, calls `onGenerateSuccess(url)` on success
- [ ] Upload errors shown inline; generation errors shown inline
- [ ] `npm run build` compiles

**Verify:** `npm run build` → `✓ Compiled successfully`

**Steps:**

- [ ] **Step 1: Replace `src/components/game-sets/CharacterEditor.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import type { Character, CharacterAttributes, GameSet } from "@/types/game";
import { generateCharacterPrompt } from "@/lib/game-engine/prompts";
import {
  HAIR_LENGTHS, HAIR_COLORS, HAIR_TEXTURES, FACIAL_HAIRS,
  GLASSES, HATS, EYE_COLORS, EXPRESSIONS, TOP_COLORS,
  OUTFIT_TYPES, ACCESSORIES,
} from "@/lib/game-engine/attributes";
import { supabase } from "@/lib/supabase/client";
import { updateCharacter } from "@/lib/supabase/db";

type Updates = Partial<Pick<Character, "displayName" | "attributes">>;

const SELECT_CLASS =
  "w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 capitalize";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function AttrSelect<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={SELECT_CLASS}>
      {options.map((o) => (
        <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
      ))}
    </select>
  );
}

export default function CharacterEditor({
  character,
  gameSet,
  onSave,
  onDelete,
  onClose,
  onGenerateSuccess,
}: {
  character: Character;
  gameSet: GameSet;
  onSave: (updates: Updates) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  onGenerateSuccess: (generatedImageUrl: string) => void;
}) {
  const [name, setName] = useState(character.displayName);
  const [attrs, setAttrs] = useState<CharacterAttributes>({ ...character.attributes });
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>(
    character.referenceImageUrls
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setAttr<K extends keyof CharacterAttributes>(key: K, value: CharacterAttributes[K]) {
    setAttrs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ displayName: name, attributes: attrs });
    setSaving(false);
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = 3 - referenceImageUrls.length;
    if (remaining <= 0) return;

    setUploadError(null);
    setUploading(true);

    const newUrls: string[] = [];
    const filesToUpload = Array.from(files).slice(0, remaining);

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${character.gameSetId}/${character.id}/ref-${referenceImageUrls.length + i}.${ext}`;

      const { error } = await supabase.storage
        .from("character-images")
        .upload(path, file, { upsert: true });

      if (error) {
        setUploadError(`Upload failed: ${error.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("character-images")
        .getPublicUrl(path);

      newUrls.push(urlData.publicUrl);
    }

    const updated = [...referenceImageUrls, ...newUrls];
    setReferenceImageUrls(updated);
    await updateCharacter(character.id, { referenceImageUrls: updated });
    setUploading(false);
  }

  function handleRemovePhoto(index: number) {
    const updated = referenceImageUrls.filter((_, i) => i !== index);
    setReferenceImageUrls(updated);
    updateCharacter(character.id, { referenceImageUrls: updated });
  }

  async function handleGenerate() {
    setGenerateError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/characters/${character.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSetId: character.gameSetId, imageStyle: gameSet.imageStyle }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error ?? `HTTP ${res.status}`);
      }
      const { generatedImageUrl } = await res.json();
      onGenerateSuccess(generatedImageUrl);
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const previewPrompt = generateCharacterPrompt(
    { ...character, displayName: name, attributes: attrs },
    gameSet
  );

  const canGenerate = referenceImageUrls.length > 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4 sticky top-8">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Edit Character</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
      </div>

      {/* Photo upload zone */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
          Reference Photos ({referenceImageUrls.length}/3)
        </label>

        {/* Thumbnails */}
        {referenceImageUrls.length > 0 && (
          <div className="flex gap-2 mb-2">
            {referenceImageUrls.map((url, i) => (
              <div key={i} className="relative w-16 h-16 rounded overflow-hidden border border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`ref ${i}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemovePhoto(i)}
                  className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-xs flex items-center justify-center rounded-bl"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {referenceImageUrls.length < 3 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              className="w-full border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-lg py-3 text-xs text-gray-500 hover:text-gray-400 transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Click or drop photos here"}
            </button>
          </>
        )}

        {uploadError && (
          <p className="text-xs text-red-400 mt-1">{uploadError}</p>
        )}
      </div>

      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hair Length">
          <AttrSelect value={attrs.hairLength} options={HAIR_LENGTHS} onChange={(v) => setAttr("hairLength", v)} />
        </Field>
        <Field label="Hair Color">
          <AttrSelect value={attrs.hairColor} options={HAIR_COLORS} onChange={(v) => setAttr("hairColor", v)} />
        </Field>
        <Field label="Hair Texture">
          <AttrSelect value={attrs.hairTexture} options={HAIR_TEXTURES} onChange={(v) => setAttr("hairTexture", v)} />
        </Field>
        <Field label="Facial Hair">
          <AttrSelect value={attrs.facialHair} options={FACIAL_HAIRS} onChange={(v) => setAttr("facialHair", v)} />
        </Field>
        <Field label="Glasses">
          <AttrSelect value={attrs.glasses} options={GLASSES} onChange={(v) => setAttr("glasses", v)} />
        </Field>
        <Field label="Hat">
          <AttrSelect value={attrs.hat} options={HATS} onChange={(v) => setAttr("hat", v)} />
        </Field>
        <Field label="Eye Color">
          <AttrSelect value={attrs.eyeColor} options={EYE_COLORS} onChange={(v) => setAttr("eyeColor", v)} />
        </Field>
        <Field label="Expression">
          <AttrSelect value={attrs.expression} options={EXPRESSIONS} onChange={(v) => setAttr("expression", v)} />
        </Field>
        <Field label="Top Color">
          <AttrSelect value={attrs.topColor} options={TOP_COLORS} onChange={(v) => setAttr("topColor", v)} />
        </Field>
        <Field label="Outfit">
          <AttrSelect value={attrs.outfitType} options={OUTFIT_TYPES} onChange={(v) => setAttr("outfitType", v)} />
        </Field>
      </div>

      <Field label="Accessory">
        <AttrSelect value={attrs.accessory} options={ACCESSORIES} onChange={(v) => setAttr("accessory", v)} />
      </Field>

      {/* Prompt preview */}
      <div>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          {showPrompt ? "Hide prompt ↑" : "Preview prompt ↓"}
        </button>
        {showPrompt && (
          <pre className="mt-2 text-xs text-gray-400 bg-gray-800 rounded p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {previewPrompt}
          </pre>
        )}
      </div>

      {generateError && (
        <p className="text-xs text-red-400">{generateError}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          title={!canGenerate ? "Upload at least one photo first" : "Generate portrait"}
          className="bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {generating ? "…" : "Generate"}
        </button>
        <button
          onClick={onDelete}
          className="text-sm text-red-500 hover:text-red-400 px-3 py-2 rounded-lg border border-red-900 hover:border-red-700 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

If `updateCharacter` import error — it's already exported from `@/lib/supabase/db`, no change needed. If `supabase` client import error — it exports `supabase` as named export from `@/lib/supabase/client`.

- [ ] **Step 3: Commit**

```bash
git add src/components/game-sets/CharacterEditor.tsx
git commit -m "feat: add photo upload zone and Generate button to CharacterEditor"
```

---

## Task 8: Game set editor — style picker + Generate All + wire updated props

**Goal:** Add an image style picker (8 pill buttons) to the game set editor header, a "Generate All" button with live progress, wire `isGenerating` to each CharacterCard, and wire `onGenerateSuccess` to the CharacterEditor. All 72 tests still pass.

**Files:**
- Modify: `src/app/game-sets/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Style picker shows all 8 styles as pill buttons; selected style highlighted in indigo
- [ ] Selecting a style calls `updateGameSet(id, { imageStyle })` and updates `gameSet` state
- [ ] "Generate All" button visible when any character has reference images
- [ ] Generate All loops through eligible characters sequentially, showing "Generating X / Y…"
- [ ] After completion: shows "Z generated. N failed." with "Retry failed" button if any failures
- [ ] `generatingCharId` passed to `CharacterCard` as `isGenerating`
- [ ] `onGenerateSuccess` prop wired to `CharacterEditor`; updates `characters` state
- [ ] All 72 tests pass

**Verify:** `npm test` → `Tests: 72 passed, 72 total`

**Steps:**

- [ ] **Step 1: Replace `src/app/game-sets/[id]/page.tsx`**

```tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  getGameSet,
  listCharacters,
  createCharacter,
  updateCharacter,
  updateGameSet,
  deleteCharacter,
  saveBalanceReport,
} from "@/lib/supabase/db";
import { evaluateDeck } from "@/lib/game-engine/balance";
import { generateCharacterPrompt } from "@/lib/game-engine/prompts";
import type { GameSet, Character, CharacterAttributes, ImageStyle } from "@/types/game";
import { GAMEPLAY_TRAITS } from "@/lib/game-engine/attributes";
import { IMAGE_STYLE_CONFIGS } from "@/lib/image-generation/styles";
import CharacterCard from "@/components/game-sets/CharacterCard";
import CharacterEditor from "@/components/game-sets/CharacterEditor";
import BalanceScoreBadge from "@/components/game-sets/BalanceScoreBadge";

const ALL_IMAGE_STYLES = Object.keys(IMAGE_STYLE_CONFIGS) as ImageStyle[];

type GenerateAllProgress = {
  done: number;
  total: number;
  failed: number;
  failedIds: string[];
};

export default function GameSetEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [gameSet, setGameSet] = useState<GameSet | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceScore, setBalanceScore] = useState<number | null>(null);
  const [isPlayable, setIsPlayable] = useState<boolean | null>(null);
  const [generatingCharId, setGeneratingCharId] = useState<string | null>(null);
  const [generateAllProgress, setGenerateAllProgress] = useState<GenerateAllProgress | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  async function load() {
    const [set, chars] = await Promise.all([getGameSet(id), listCharacters(id)]);
    setGameSet(set);
    setCharacters(chars);
    setLoading(false);
    if (chars.length > 0) runBalance(chars);
  }

  useEffect(() => { load(); }, [id]);

  function runBalance(chars: Character[]) {
    const report = evaluateDeck(chars);
    setBalanceScore(report.score);
    setIsPlayable(report.isPlayable);
  }

  async function handleStyleChange(style: ImageStyle) {
    if (!gameSet) return;
    const updated = await updateGameSet(id, { imageStyle: style });
    setGameSet(updated);
  }

  async function handleAddCharacter() {
    if (!gameSet) return;
    const defaultAttrs: CharacterAttributes = {
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
    const char = await createCharacter({
      gameSetId: id,
      displayName: `Character ${characters.length + 1}`,
      attributes: defaultAttrs,
    });
    const updated = [...characters, char];
    setCharacters(updated);
    setSelectedId(char.id);
    runBalance(updated);
  }

  async function handleSaveCharacter(
    charId: string,
    updates: Partial<Pick<Character, "displayName" | "attributes">>
  ) {
    if (!gameSet) return;
    const updatedChar = await updateCharacter(charId, updates);

    const prompt = generateCharacterPrompt(
      { ...updatedChar, ...updates } as Character,
      gameSet
    );
    await updateCharacter(charId, { prompt });

    const updated = characters.map((c) =>
      c.id === charId ? { ...updatedChar, prompt } : c
    );
    setCharacters(updated);

    const report = evaluateDeck(updated);
    setBalanceScore(report.score);
    setIsPlayable(report.isPlayable);
    await saveBalanceReport(id, report);
  }

  function handleGenerateSuccess(charId: string, generatedImageUrl: string) {
    setCharacters((prev) =>
      prev.map((c) => (c.id === charId ? { ...c, generatedImageUrl } : c))
    );
  }

  async function handleDeleteCharacter(charId: string) {
    await deleteCharacter(charId);
    const updated = characters.filter((c) => c.id !== charId);
    setCharacters(updated);
    if (selectedId === charId) setSelectedId(null);
    runBalance(updated);
  }

  async function generateSingle(char: Character): Promise<string> {
    if (!gameSet) throw new Error("No game set");
    const res = await fetch(`/api/characters/${char.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameSetId: id, imageStyle: gameSet.imageStyle }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Unknown" }));
      throw new Error(error ?? `HTTP ${res.status}`);
    }
    const { generatedImageUrl } = await res.json();
    return generatedImageUrl;
  }

  async function handleGenerateAll() {
    if (!gameSet) return;
    const eligible = characters.filter((c) => c.referenceImageUrls.length > 0);
    if (eligible.length === 0) return;

    setIsGeneratingAll(true);
    setGenerateAllProgress({ done: 0, total: eligible.length, failed: 0, failedIds: [] });

    let failed = 0;
    const failedIds: string[] = [];

    for (const char of eligible) {
      setGeneratingCharId(char.id);
      try {
        const url = await generateSingle(char);
        setCharacters((prev) =>
          prev.map((c) => (c.id === char.id ? { ...c, generatedImageUrl: url } : c))
        );
      } catch {
        failed++;
        failedIds.push(char.id);
      }
      setGenerateAllProgress((prev) => ({
        done: (prev?.done ?? 0) + 1,
        total: eligible.length,
        failed,
        failedIds: [...failedIds],
      }));
    }

    setGeneratingCharId(null);
    setIsGeneratingAll(false);
  }

  async function handleRetryFailed() {
    if (!generateAllProgress || !gameSet) return;
    const toRetry = characters.filter((c) =>
      generateAllProgress.failedIds.includes(c.id)
    );
    if (toRetry.length === 0) return;

    setIsGeneratingAll(true);
    setGenerateAllProgress({ done: 0, total: toRetry.length, failed: 0, failedIds: [] });

    let failed = 0;
    const failedIds: string[] = [];

    for (const char of toRetry) {
      setGeneratingCharId(char.id);
      try {
        const url = await generateSingle(char);
        setCharacters((prev) =>
          prev.map((c) => (c.id === char.id ? { ...c, generatedImageUrl: url } : c))
        );
      } catch {
        failed++;
        failedIds.push(char.id);
      }
      setGenerateAllProgress((prev) => ({
        done: (prev?.done ?? 0) + 1,
        total: toRetry.length,
        failed,
        failedIds: [...failedIds],
      }));
    }

    setGeneratingCharId(null);
    setIsGeneratingAll(false);
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (!gameSet) return <p className="text-red-400">Game set not found.</p>;

  const selectedChar = characters.find((c) => c.id === selectedId) ?? null;
  const eligibleCount = characters.filter((c) => c.referenceImageUrls.length > 0).length;

  return (
    <div className="flex gap-6">
      {/* Left: grid */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/game-sets" className="text-gray-500 hover:text-gray-300 text-sm">
                ← Sets
              </Link>
              <h1 className="text-xl font-bold">{gameSet.title}</h1>
              {balanceScore !== null && (
                <BalanceScoreBadge score={balanceScore} isPlayable={isPlayable ?? false} />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {characters.length}/24 characters · Theme: {gameSet.theme.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Link
              href={`/game-sets/${id}/balance`}
              className="text-sm border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-1.5 rounded transition-colors"
            >
              Balance Report
            </Link>
            {characters.length === 24 && (
              <Link
                href={`/game-sets/${id}/print`}
                className="text-sm border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-1.5 rounded transition-colors"
                target="_blank"
              >
                Print View
              </Link>
            )}
            {eligibleCount > 0 && !isGeneratingAll && (
              <button
                onClick={handleGenerateAll}
                className="text-sm bg-violet-700 hover:bg-violet-600 text-white px-3 py-1.5 rounded transition-colors"
              >
                Generate All
              </button>
            )}
            {characters.length < 24 && (
              <button
                onClick={handleAddCharacter}
                className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors"
              >
                + Add Character
              </button>
            )}
          </div>
        </div>

        {/* Image style picker */}
        <div className="flex flex-wrap gap-2 mb-4">
          {ALL_IMAGE_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => handleStyleChange(style)}
              title={IMAGE_STYLE_CONFIGS[style].description}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                gameSet.imageStyle === style
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              {IMAGE_STYLE_CONFIGS[style].label}
            </button>
          ))}
        </div>

        {/* Generate All progress */}
        {generateAllProgress && (
          <div className="mb-4 text-sm text-gray-400">
            {isGeneratingAll ? (
              <span>Generating {generateAllProgress.done} / {generateAllProgress.total}…</span>
            ) : (
              <span>
                {generateAllProgress.done - generateAllProgress.failed} / {generateAllProgress.total} generated.
                {generateAllProgress.failed > 0 && (
                  <>
                    {" "}{generateAllProgress.failed} failed.{" "}
                    <button
                      onClick={handleRetryFailed}
                      className="text-indigo-400 underline hover:text-indigo-300"
                    >
                      Retry failed
                    </button>
                  </>
                )}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          {characters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              selected={char.id === selectedId}
              isGenerating={generatingCharId === char.id}
              onClick={() => setSelectedId(char.id === selectedId ? null : char.id)}
            />
          ))}
          {characters.length < 24 &&
            Array.from({ length: 24 - characters.length }).map((_, i) => (
              <button
                key={`empty-${i}`}
                onClick={handleAddCharacter}
                className="aspect-[3/4] border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center text-gray-700 hover:border-gray-600 hover:text-gray-500 transition-colors text-2xl"
              >
                +
              </button>
            ))}
        </div>
      </div>

      {/* Right: editor panel */}
      {selectedChar && (
        <div className="w-80 shrink-0">
          <CharacterEditor
            character={selectedChar}
            gameSet={gameSet}
            onSave={(updates) => handleSaveCharacter(selectedChar.id, updates)}
            onDelete={() => handleDeleteCharacter(selectedChar.id)}
            onClose={() => setSelectedId(null)}
            onGenerateSuccess={(url) => handleGenerateSuccess(selectedChar.id, url)}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: `Tests: 72 passed, 72 total`

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/app/game-sets/[id]/page.tsx
git commit -m "feat: add image style picker and Generate All to game set editor"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Admin uploads 1–3 photos per character — Task 7 upload zone
- [x] 8 image styles selectable on game set — Task 8 style picker
- [x] Per-character Generate button — Task 7
- [x] Generate All with live progress + retry — Task 8
- [x] Generated images appear on CharacterCards immediately — Task 6 + `generatedImageUrl` state update
- [x] Spinner overlay during generation — Task 6
- [x] ✓ badge when generated — Task 6
- [x] All 47 existing tests still pass — verified in every task
- [x] DB migration for `image_style` + `reference_image_urls` — Task 2
- [x] Supabase Storage bucket — documented in Task 4
- [x] 429 retry logic — Task 5
- [x] "No reference photos" 400 response — Task 5
- [x] Error messages shown inline — Tasks 7 + 8

**Type consistency:**
- `referenceImageUrls: string[]` used consistently in types (Task 1), db.ts (Task 2), CharacterCard (Task 6), CharacterEditor (Task 7), page.tsx (Task 8) ✓
- `imageStyle: ImageStyle` on `GameSet` used in Task 1 type, Task 2 mapper, Task 8 picker and generate calls ✓
- `GeneratedImageResult.imageData` used in GeminiImageProvider (Task 4) and API route (Task 5) ✓
- `onGenerateSuccess` prop name used consistently in CharacterEditor (Task 7) and page.tsx (Task 8) ✓
- `IMAGE_STYLE_CONFIGS` imported from `@/lib/image-generation/styles` in Tasks 3, 5, 8 ✓
