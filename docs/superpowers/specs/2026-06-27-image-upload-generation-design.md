# Image Upload & AI Generation Design

**Date:** 2026-06-27
**Feature:** Reference photo upload + Gemini-powered styled portrait generation
**Status:** Approved — ready for implementation planning

---

## Overview

Admin uploads 1–3 reference photos per character. The game set has a single image style (e.g. Pixar 3D, Simpsons). Admin triggers generation per character or for all 24 at once. A Next.js API route calls the Gemini image generation API with the reference photos and a styled prompt, receives a generated portrait, stores it in Supabase Storage, and updates the character record.

---

## Data Model

### DB changes (migration 002)

**`game_sets` table** — add column:
```sql
alter table game_sets add column image_style text not null default 'pixar';
```

**`characters` table** — replace single reference URL with array:
```sql
alter table characters add column reference_image_urls text[] default '{}';
alter table characters drop column if exists reference_image_url;
```

### TypeScript types (additions to `src/types/game.ts`)

```ts
export type ImageStyle =
  | "cartoon"
  | "realistic"
  | "simpsons"
  | "pixar"
  | "watercolour"
  | "anime"
  | "lego"
  | "southpark";
```

`GameSet` gains `imageStyle: ImageStyle`.
`Character` gains `referenceImageUrls: string[]` (replaces `referenceImageUrl?: string`).

### Supabase Storage

New public bucket: `character-images`

File layout:
```
character-images/
  {gameSetId}/{characterId}/ref-0.jpg
  {gameSetId}/{characterId}/ref-1.jpg
  {gameSetId}/{characterId}/ref-2.jpg
  {gameSetId}/{characterId}/generated.jpg
```

Public read. Uploads performed directly from the browser using the Supabase JS client (no API route needed for upload).

---

## Image Styles

Defined in `src/lib/image-generation/styles.ts`:

```ts
export type ImageStyleConfig = {
  label: string;
  description: string;
  promptModifier: string;
};

export const IMAGE_STYLE_CONFIGS: Record<ImageStyle, ImageStyleConfig> = {
  cartoon:     { label: "Cartoon",         description: "Bold outlines, flat colours, exaggerated features.", promptModifier: "Render in a bold cartoon illustration style with clean outlines, flat vibrant colours, and exaggerated friendly features." },
  realistic:   { label: "Realistic",       description: "Photo-like digital portrait.", promptModifier: "Render as a photorealistic digital portrait with accurate facial likeness, professional studio lighting, and sharp detail." },
  simpsons:    { label: "Simpsons",        description: "Yellow skin, overbite, Springfield style.", promptModifier: "Render in The Simpsons animation style: yellow skin tone, overbite, simple oval eyes, flat colour fills, Springfield aesthetic." },
  pixar:       { label: "Pixar 3D",        description: "Warm 3D render, large eyes, friendly proportions.", promptModifier: "Render in Pixar 3D animation style: warm polished render, large expressive eyes, soft studio lighting, friendly rounded proportions." },
  watercolour: { label: "Watercolour",     description: "Painterly washes, soft edges.", promptModifier: "Render as a watercolour portrait painting with soft colour washes, painterly brushwork, and slightly loose edges." },
  anime:       { label: "Anime",           description: "Large eyes, clean lines, vibrant colours.", promptModifier: "Render in Japanese anime style: large expressive eyes, clean bold outlines, vibrant colours, high-contrast shading." },
  lego:        { label: "LEGO Minifigure", description: "Blocky yellow figure with printed face.", promptModifier: "Render as a LEGO minifigure: blocky yellow plastic body, printed facial features, classic LEGO proportions, studio product lighting." },
  southpark:   { label: "South Park",      description: "Flat cutout, simple round head.", promptModifier: "Render in South Park animation style: flat 2D cutout aesthetic, simple round head, construction paper texture, limited colour palette." },
};
```

---

## API Layer

### `POST /api/characters/[id]/generate`

**Request body:**
```ts
{ gameSetId: string; imageStyle: ImageStyle }
```

**Server flow:**
1. Fetch character and game set from Supabase.
2. Validate: character must have at least one reference image URL.
3. Download each reference image from Supabase Storage as base64.
4. Build prompt:
   - Base: output of existing `generateCharacterPrompt(character, gameSet)`
   - Append: `IMAGE_STYLE_CONFIGS[imageStyle].promptModifier`
5. Call `GeminiImageProvider.generateImage(prompt, referenceImages)`.
6. Upload returned image bytes to `character-images/{setId}/{charId}/generated.jpg`.
7. Update `characters.generated_image_url` in DB.
8. Return `{ generatedImageUrl: string }`.

**Error responses:**
- `400` — no reference images uploaded
- `500` — Gemini API failure (includes error message)
- `429` handling — retry once after 2-second delay, then return 500

### Storage uploads (browser-side)

No API route. Browser uses Supabase JS client:
```ts
supabase.storage.from("character-images").upload(path, file)
```
On success, save public URL to `characters.reference_image_urls` array via existing `updateCharacter()`.

---

## Image Generation Service

### `src/lib/image-generation/GeminiImageProvider.ts`

Implements the existing `ImageGenerationProvider` interface from `src/types/game.ts`.

The existing `ImageGenerationProvider` interface in `src/types/game.ts` is updated from `referenceImageUrl?: string` to `referenceImageUrls: string[]`:

```ts
// Updated interface in src/types/game.ts
export interface ImageGenerationProvider {
  generateImage(prompt: string, referenceImageUrls: string[]): Promise<GeneratedImageResult>;
}

class GeminiImageProvider implements ImageGenerationProvider {
  async generateImage(
    prompt: string,
    referenceImageUrls: string[]
  ): Promise<GeneratedImageResult>
}
```

- Uses `@google/genai` SDK with model `gemini-2.0-flash-preview-image-generation`.
- Builds a multipart request: text prompt part + one `inlineData` image part per reference photo.
- Returns the first generated image as base64 with mime type.
- Does not handle Storage or DB — stays pure and testable.

**Environment variable required:**
```
GOOGLE_AI_API_KEY=...
```
Added to `.env.local` (already gitignored).

---

## UI Changes

### Game Set Editor (`/game-sets/[id]/page.tsx`)

- **Image style picker** in the header bar: pill buttons for each of the 8 styles. Selecting one calls `updateGameSet(id, { imageStyle })`. Displays style label + short description on hover.
- **"Generate All" button** in the header. Loops through all 24 characters sequentially, skipping those without reference images, calling the generate API for each. Shows live counter: *"Generating 5 / 24..."*. After completion: *"22 / 24 generated. 2 failed."* with a "Retry failed" button.

### CharacterEditor panel (`src/components/game-sets/CharacterEditor.tsx`)

- **Photo upload zone** (new section, above attribute dropdowns):
  - Click to open file picker or drag-and-drop
  - Accepts image files only, max 3
  - Shows thumbnail previews with × remove button
  - Uploads to Storage on drop/select, saves URL to character immediately
- **"Generate" button** at bottom of editor panel (beside existing Save/Delete)
  - Triggers `POST /api/characters/[id]/generate`
  - Shows spinner during generation
  - On success: updates `generatedImageUrl` in local state and DB
  - On failure: shows error message inline

### CharacterCard (`src/components/game-sets/CharacterCard.tsx`)

- Spinner overlay during generation (no layout change)
- ✓ badge (green dot) when `generatedImageUrl` is present

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| No reference photos | "Generate" button disabled with tooltip: "Upload at least one photo first" |
| Gemini 429 rate limit | Retry once after 2s, then mark as failed |
| Gemini other error | Mark character as failed, continue batch |
| Storage upload failure | Show inline error in CharacterEditor, do not update DB |
| Batch partial failure | Continue all 24, show summary: "X failed — Retry failed" button |

---

## New Files

```
src/
  app/
    api/
      characters/
        [id]/
          generate/
            route.ts            ← POST handler
  lib/
    image-generation/
      GeminiImageProvider.ts    ← Gemini API wrapper
      styles.ts                 ← IMAGE_STYLE_CONFIGS

supabase/
  migrations/
    002_image_style.sql         ← DB schema changes
```

## Modified Files

```
src/types/game.ts               ← Add ImageStyle, update GameSet + Character types
src/lib/supabase/db.ts          ← Update GameSet/Character mappers + CRUD
src/app/game-sets/[id]/page.tsx ← Style picker + Generate All button
src/components/game-sets/
  CharacterEditor.tsx           ← Photo upload zone + Generate button
  CharacterCard.tsx             ← Spinner + ✓ badge
```

---

## Dependencies

```
@google/genai    ← Google Generative AI SDK (npm install)
```

No other new dependencies.

---

## Success Criteria

- Admin can upload 1–3 photos per character in the CharacterEditor panel
- Admin can select an image style on the game set editor (8 options)
- "Generate" button in CharacterEditor generates and displays a portrait for that character
- "Generate All" on the set editor generates all characters with reference photos, showing live progress
- Failed characters show a retry option
- Generated images appear on CharacterCards immediately
- All existing 47 tests still pass
