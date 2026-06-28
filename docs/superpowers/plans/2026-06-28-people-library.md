# People Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a People library — save real people with reference photos once, assign them to any game set character with a single click.

**Architecture:** New `people` Supabase table + nullable `person_id` FK on `characters`. People panel always visible in the right column of the game set editor. No new API routes — all CRUD goes through the Supabase client directly.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + Storage), React, TypeScript, Tailwind CSS.

---

### Task 1: DB migration + types + DB layer

**Goal:** Schema, TypeScript types, and Supabase DB functions for people.

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/supabase/db.ts`
- Manual: run migration SQL in Supabase dashboard

**Acceptance Criteria:**
- [ ] `Person` type exported from `@/types/game`
- [ ] `Character.personId?: string` exists
- [ ] `listPeople`, `createPerson`, `updatePerson`, `deletePerson` exported from `@/lib/supabase/db`
- [ ] `updateCharacter` accepts `personId?: string | null`
- [ ] `npx tsc --noEmit` passes with no errors

**Verify:** `npx tsc --noEmit` → no output (clean)

**Steps:**

- [ ] **Step 1: Run migration in Supabase dashboard**

Open the Supabase project → SQL Editor → run:

```sql
create table people (
  id uuid default gen_random_uuid() primary key,
  display_name text not null,
  reference_image_urls text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table characters
  add column person_id uuid references people(id) on delete set null;
```

- [ ] **Step 2: Add `Person` type and update `Character` in `src/types/game.ts`**

Add after the `Character` type's closing brace (after line 124):

```ts
export type Person = {
  id: string;
  displayName: string;
  referenceImageUrls: string[];
  createdAt: string;
  updatedAt: string;
};
```

Add `personId?: string;` to the `Character` type, after `generatedImageUrl?`:

```ts
export type Character = {
  id: string;
  gameSetId: string;
  displayName: string;
  referenceImageUrls: string[];
  generatedImageUrl?: string;
  personId?: string;           // ← add this line
  attributes: CharacterAttributes;
  prompt?: string;
  balanceWarnings?: string[];
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 3: Add `Person` import and `rowToPerson` to `src/lib/supabase/db.ts`**

Add `Person` to the import:
```ts
import type {
  GameSet,
  Character,
  CharacterAttributes,
  DeckBalanceReport,
  Person,
} from "@/types/game";
```

Add `rowToPerson` mapper after `rowToCharacter`:
```ts
function rowToPerson(row: Record<string, unknown>): Person {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    referenceImageUrls: (row.reference_image_urls as string[] | null) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

Also update `rowToCharacter` to map `person_id`:
```ts
function rowToCharacter(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    gameSetId: row.game_set_id as string,
    displayName: row.display_name as string,
    referenceImageUrls: (row.reference_image_urls as string[] | null) ?? [],
    generatedImageUrl: row.generated_image_url as string | undefined,
    personId: row.person_id as string | undefined,
    attributes: row.attributes as CharacterAttributes,
    prompt: row.prompt as string | undefined,
    balanceWarnings: row.balance_warnings as string[] | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

- [ ] **Step 4: Add people CRUD functions to `src/lib/supabase/db.ts`**

Add after the `deleteGameSet` function (before `// ─── Character CRUD`):

```ts
// ─── People CRUD ──────────────────────────────────────────────────────────────

export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToPerson);
}

export async function createPerson(input: { displayName: string }): Promise<Person> {
  const { data, error } = await supabase
    .from("people")
    .insert({ display_name: input.displayName })
    .select()
    .single();
  if (error) throw error;
  return rowToPerson(data);
}

export async function updatePerson(
  id: string,
  input: Partial<{ displayName: string; referenceImageUrls: string[] }>
): Promise<Person> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.referenceImageUrls !== undefined) patch.reference_image_urls = input.referenceImageUrls;
  const { data, error } = await supabase
    .from("people")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToPerson(data);
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 5: Extend `updateCharacter` to accept `personId`**

Change the `input` type signature of `updateCharacter`:

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
  > & { personId?: string | null }
): Promise<Character> {
```

Add to the patch-building block (after `balanceWarnings` patch line):
```ts
if ("personId" in input) patch.person_id = input.personId ?? null;
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
```

Expected: no output (clean). Fix any type errors before continuing.

- [ ] **Step 7: Commit**

```bash
git add src/types/game.ts src/lib/supabase/db.ts
git commit -m "feat: add Person type and people CRUD to DB layer"
```

---

### Task 2: PersonForm component

**Goal:** Inline form for creating and editing a person (name + photo upload).

**Files:**
- Create: `src/components/people/PersonForm.tsx`

**Acceptance Criteria:**
- [ ] Create mode: name input + Create button → calls `createPerson` → `onSave(person)` → form switches to edit mode for photo upload
- [ ] Edit mode: name changes + photo upload/remove (up to 3 photos, stored at `people/{id}/ref-{n}.{ext}`)
- [ ] Delete button (edit mode only) calls `deletePerson` + `onDelete()`
- [ ] Cancel button calls `onClose()`
- [ ] `npx tsc --noEmit` passes

**Verify:** `npx tsc --noEmit` → no output

**Steps:**

- [ ] **Step 1: Create `src/components/people/PersonForm.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import type { Person } from "@/types/game";
import { createPerson, updatePerson, deletePerson } from "@/lib/supabase/db";
import { supabase } from "@/lib/supabase/client";

export default function PersonForm({
  person,
  onSave,
  onDelete,
  onClose,
}: {
  person?: Person;
  onSave: (person: Person) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(person?.displayName ?? "");
  const [urls, setUrls] = useState<string[]>(person?.referenceImageUrls ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!person;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let saved: Person;
      if (person) {
        saved = await updatePerson(person.id, { displayName: name.trim() });
      } else {
        saved = await createPerson({ displayName: name.trim() });
      }
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || !person) return;
    setUploading(true);
    setError(null);
    let current = [...urls];
    for (const file of Array.from(files)) {
      if (current.length >= 3) break;
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `people/${person.id}/ref-${current.length}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("character-images")
        .upload(path, file, { upsert: true });
      if (uploadErr) { setError(uploadErr.message); break; }
      const { data } = supabase.storage.from("character-images").getPublicUrl(path);
      current = [...current, data.publicUrl];
    }
    if (current.length > urls.length) {
      setUrls(current);
      await updatePerson(person.id, { referenceImageUrls: current });
    }
    setUploading(false);
  }

  async function handleRemovePhoto(index: number) {
    if (!person) return;
    const updated = urls.filter((_, i) => i !== index);
    setUrls(updated);
    await updatePerson(person.id, { referenceImageUrls: updated });
  }

  async function handleDelete() {
    if (!person) return;
    await deletePerson(person.id);
    onDelete?.();
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        placeholder="Name"
        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
      />

      {/* Photos only available after person is created (need ID for storage path) */}
      {isEditMode && (
        <div>
          {urls.length > 0 && (
            <div className="flex gap-1.5 mb-2">
              {urls.map((url, i) => (
                <div key={i} className="relative w-12 h-12 rounded overflow-hidden border border-gray-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-xs flex items-center justify-center rounded-bl"
                  >×</button>
                </div>
              ))}
            </div>
          )}
          {urls.length < 3 && (
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
                className="w-full border border-dashed border-gray-600 hover:border-gray-400 rounded py-1.5 text-xs text-gray-500 hover:text-gray-400 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : `Add photo (${urls.length}/3)`}
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-1.5 rounded text-xs font-medium"
        >
          {saving ? "Saving…" : isEditMode ? "Save name" : "Create"}
        </button>
        {isEditMode && onDelete && (
          <button
            onClick={handleDelete}
            className="text-xs text-red-500 hover:text-red-400 px-2 py-1.5 rounded border border-red-900 hover:border-red-700"
          >
            Delete
          </button>
        )}
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/people/PersonForm.tsx
git commit -m "feat: add PersonForm component (create/edit/delete person with photos)"
```

---

### Task 3: PeoplePanel component

**Goal:** Always-visible panel showing the people library. Handles assign-on-click and inline create/edit.

**Files:**
- Create: `src/components/people/PeoplePanel.tsx`

**Acceptance Criteria:**
- [ ] Compact 3-column grid of person thumbnails
- [ ] Clicking a person card when `selectedCharId` is set → calls `onAssign(person)`
- [ ] Clicking a person card when no character selected → opens `PersonForm` in edit mode inline
- [ ] Clicking `+ Add` → opens `PersonForm` in create mode
- [ ] After create, form stays open in edit mode for that person (so photos can be uploaded)
- [ ] Only one form open at a time
- [ ] Empty state message when no people exist
- [ ] `npx tsc --noEmit` passes

**Verify:** `npx tsc --noEmit` → no output

**Steps:**

- [ ] **Step 1: Create `src/components/people/PeoplePanel.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Person } from "@/types/game";
import PersonForm from "./PersonForm";

export default function PeoplePanel({
  people,
  selectedCharId,
  onAssign,
  onPeopleChange,
}: {
  people: Person[];
  selectedCharId: string | null;
  onAssign: (person: Person) => Promise<void>;
  onPeopleChange: (people: Person[]) => void;
}) {
  // null = closed, "new" = create form, uuid = edit form for that person
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const editingPerson =
    editingId && editingId !== "new"
      ? people.find((p) => p.id === editingId)
      : undefined;

  async function handleCardClick(person: Person) {
    if (selectedCharId) {
      setAssigning(person.id);
      try {
        await onAssign(person);
      } finally {
        setAssigning(null);
      }
    } else {
      setEditingId(editingId === person.id ? null : person.id);
    }
  }

  function handleSaved(saved: Person) {
    const exists = people.some((p) => p.id === saved.id);
    if (exists) {
      onPeopleChange(people.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      // New person created — add to list and switch to edit mode for photo upload
      onPeopleChange([...people, saved]);
      setEditingId(saved.id);
    }
  }

  function handleDeleted(personId: string) {
    onPeopleChange(people.filter((p) => p.id !== personId));
    setEditingId(null);
  }

  const hasSelection = selectedCharId !== null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">People</h3>
        <button
          onClick={() => setEditingId(editingId === "new" ? null : "new")}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          + Add
        </button>
      </div>

      {hasSelection && (
        <p className="text-xs text-indigo-400 mb-2">Click a person to assign →</p>
      )}

      {people.length === 0 && editingId === null ? (
        <p className="text-xs text-gray-600 text-center py-3">No people yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {people.map((person) => {
            const isAssigning = assigning === person.id;
            const isEditing = editingId === person.id;
            return (
              <button
                key={person.id}
                onClick={() => handleCardClick(person)}
                disabled={isAssigning}
                className={`relative group flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors ${
                  isEditing
                    ? "bg-gray-700 border border-gray-600"
                    : hasSelection
                    ? "hover:bg-indigo-900/40 border border-transparent hover:border-indigo-700"
                    : "hover:bg-gray-800 border border-transparent"
                } disabled:opacity-50`}
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center shrink-0">
                  {person.referenceImageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.referenceImageUrls[0]}
                      alt={person.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 text-xl">👤</span>
                  )}
                  {hasSelection && !isAssigning && (
                    <div className="absolute inset-0 bg-indigo-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">Assign</span>
                    </div>
                  )}
                  {isAssigning && (
                    <div className="absolute inset-0 bg-indigo-900/80 flex items-center justify-center">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-300 truncate w-full text-center leading-tight">
                  {person.displayName}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {editingId !== null && (
        <div className="mt-3">
          <PersonForm
            person={editingPerson}
            onSave={handleSaved}
            onDelete={editingPerson ? () => handleDeleted(editingPerson.id) : undefined}
            onClose={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/people/PeoplePanel.tsx
git commit -m "feat: add PeoplePanel component with assign-on-click and inline create/edit"
```

---

### Task 4: CharacterEditor assigned-person badge

**Goal:** Show who is assigned to a character in the editor, with an unassign button.

**Files:**
- Modify: `src/components/game-sets/CharacterEditor.tsx`

**Acceptance Criteria:**
- [ ] New prop `assignedPerson?: Person | null`
- [ ] When `assignedPerson` is set, a badge shows above the reference photos section
- [ ] Badge shows person's first thumbnail + name
- [ ] `×` unassign button calls `updateCharacter(character.id, { personId: null })` then `onUnassign()`
- [ ] New prop `onUnassign?: () => void`
- [ ] `npx tsc --noEmit` passes

**Verify:** `npx tsc --noEmit` → no output

**Steps:**

- [ ] **Step 1: Add `Person` import to `CharacterEditor.tsx`**

```ts
import type { Character, CharacterAttributes, GameSet, Person } from "@/types/game";
```

- [ ] **Step 2: Add `assignedPerson` and `onUnassign` props**

Update the props type:
```ts
export default function CharacterEditor({
  character,
  gameSet,
  onSave,
  onDelete,
  onClose,
  onGenerateSuccess,
  assignedPerson,
  onUnassign,
}: {
  character: Character;
  gameSet: GameSet;
  onSave: (updates: Updates) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  onGenerateSuccess?: (generatedImageUrl: string) => void;
  assignedPerson?: Person | null;
  onUnassign?: () => void;
}) {
```

- [ ] **Step 3: Add unassign handler**

Add after `handleRemovePhoto`:
```ts
async function handleUnassign() {
  await updateCharacter(character.id, { personId: null });
  onUnassign?.();
}
```

- [ ] **Step 4: Add assigned-person badge above the reference photos section**

Insert this block immediately before the `{/* Photo upload zone */}` comment:
```tsx
{/* Assigned person badge */}
{assignedPerson && (
  <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 shrink-0">
      {assignedPerson.referenceImageUrls[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assignedPerson.referenceImageUrls[0]}
          alt={assignedPerson.displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="w-full h-full flex items-center justify-center text-gray-500 text-sm">👤</span>
      )}
    </div>
    <span className="text-sm text-gray-200 flex-1 truncate">{assignedPerson.displayName}</span>
    <button
      onClick={handleUnassign}
      className="text-gray-500 hover:text-gray-300 text-xs"
      title="Unassign person"
    >
      ×
    </button>
  </div>
)}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/game-sets/CharacterEditor.tsx
git commit -m "feat: show assigned person badge in CharacterEditor with unassign"
```

---

### Task 5: Wire everything together in the game set editor page

**Goal:** Load people on mount, render `PeoplePanel` always, handle assign/unassign, pass `assignedPerson` to `CharacterEditor`.

**Files:**
- Modify: `src/app/game-sets/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] People loaded from DB on mount alongside game set + characters
- [ ] Right column always rendered (not gated on `selectedChar`)
- [ ] `PeoplePanel` renders above `CharacterEditor` in the right column
- [ ] Clicking a person card while a character is selected assigns them (copies photos + personId)
- [ ] Unassigning clears `personId` in state
- [ ] `CharacterEditor` receives `assignedPerson` and `onUnassign`
- [ ] `npx tsc --noEmit` passes, app loads without errors

**Verify:** `npx tsc --noEmit` → no output; open game set in browser → People panel visible, assign works

**Steps:**

- [ ] **Step 1: Add `people` imports to the page**

```ts
import {
  getGameSet,
  listCharacters,
  listPeople,
  createCharacter,
  updateCharacter,
  updateGameSet,
  deleteCharacter,
  saveBalanceReport,
} from "@/lib/supabase/db";
import type { GameSet, Character, CharacterAttributes, ImageStyle, Person } from "@/types/game";
import PeoplePanel from "@/components/people/PeoplePanel";
```

- [ ] **Step 2: Add `people` state and load on mount**

Add state:
```ts
const [people, setPeople] = useState<Person[]>([]);
```

Update `load()`:
```ts
async function load() {
  const [set, chars, ppl] = await Promise.all([
    getGameSet(id),
    listCharacters(id),
    listPeople(),
  ]);
  setGameSet(set);
  setCharacters(chars);
  setPeople(ppl);
  setLoading(false);
  if (chars.length > 0) runBalance(chars);
}
```

- [ ] **Step 3: Add `handleAssignPerson` and `handleUnassignPerson`**

```ts
async function handleAssignPerson(person: Person) {
  if (!selectedId) return;
  await updateCharacter(selectedId, {
    referenceImageUrls: person.referenceImageUrls,
    personId: person.id,
  });
  setCharacters((prev) =>
    prev.map((c) =>
      c.id === selectedId
        ? { ...c, referenceImageUrls: person.referenceImageUrls, personId: person.id }
        : c
    )
  );
}

function handleUnassignPerson() {
  if (!selectedId) return;
  setCharacters((prev) =>
    prev.map((c) =>
      c.id === selectedId ? { ...c, personId: undefined } : c
    )
  );
}
```

- [ ] **Step 4: Update the JSX — make right column always render, add PeoplePanel**

Replace the closing `</div>` of the flex container and the right column block:

```tsx
      {/* Right column: People panel (always) + Character editor (when selected) */}
      <div className="w-80 shrink-0 flex flex-col gap-4">
        <PeoplePanel
          people={people}
          selectedCharId={selectedId}
          onAssign={handleAssignPerson}
          onPeopleChange={setPeople}
        />
        {selectedChar && (
          <CharacterEditor
            character={selectedChar}
            gameSet={gameSet}
            assignedPerson={people.find((p) => p.id === selectedChar.personId) ?? null}
            onSave={(updates) => handleSaveCharacter(selectedChar.id, updates)}
            onDelete={() => handleDeleteCharacter(selectedChar.id)}
            onClose={() => setSelectedId(null)}
            onGenerateSuccess={(url) => handleGenerateSuccess(selectedChar.id, url)}
            onUnassign={handleUnassignPerson}
          />
        )}
      </div>
    </div>
  );
```

- [ ] **Step 5: Verify types**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Smoke test in browser**

Start dev server (`npm run dev`), open a game set:
- People panel appears on the right at all times
- Click `+ Add`, enter a name, click Create → form stays open, shows photo upload
- Upload a photo → thumbnail appears
- Click a character slot → editor opens below the People panel
- Click the person card → "Assign" overlay appears on hover, clicking assigns the person
- Assigned person badge appears at top of character editor
- Click `×` on badge → badge disappears

- [ ] **Step 7: Commit**

```bash
git add src/app/game-sets/[id]/page.tsx
git commit -m "feat: wire PeoplePanel into game set editor — load, assign, unassign"
```
