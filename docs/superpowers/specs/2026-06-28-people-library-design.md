# People Library Design

## Goal

Allow users to save real people (name + reference photos) once, then assign them to characters across any game set — eliminating repeated photo uploads and making re-renders across styles trivial.

## Architecture

A `people` table in Supabase stores named people with their reference photos. Characters gain a nullable `person_id` FK. The game set editor gains a permanent People panel in the right column. Assigning a person copies their photos to the character and records the link. All CRUD goes through the existing Supabase client — no new API routes needed.

## Tech Stack

Next.js 15 App Router, Supabase (Postgres + Storage), React, TypeScript, Tailwind CSS.

---

## Database

### New table: `people`

```sql
create table people (
  id uuid default gen_random_uuid() primary key,
  display_name text not null,
  reference_image_urls text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Alter `characters`

```sql
alter table characters
  add column person_id uuid references people(id) on delete set null;
```

`on delete set null` — deleting a person does not delete characters that used them; it just clears the link.

---

## Storage

Reuse the existing `character-images` bucket. People photos are stored under:

```
people/{person_id}/ref-0.jpg
people/{person_id}/ref-1.jpg
...
```

No new bucket or policy changes needed.

---

## Types (`src/types/game.ts`)

### New type

```ts
export type Person = {
  id: string;
  displayName: string;
  referenceImageUrls: string[];
  createdAt: string;
  updatedAt: string;
};
```

### Updated `Character`

Add one optional field:

```ts
personId?: string;
```

---

## DB Layer (`src/lib/supabase/db.ts`)

Four new functions following the existing pattern:

- `listPeople(): Promise<Person[]>` — ordered by `display_name`
- `createPerson(input: { displayName: string }): Promise<Person>`
- `updatePerson(id, input: Partial<{ displayName, referenceImageUrls }>): Promise<Person>`
- `deletePerson(id): Promise<void>`

`rowToPerson` mapper handles snake_case → camelCase.

`updateCharacter` already handles partial patches; `person_id` will be added to the patch map.

---

## UI Layout

```
┌─────────────────────────────────┬──────────────────────┐
│                                 │  PEOPLE PANEL        │
│  Character grid (4 cols)        │  [compact grid]      │
│                                 │  ──────────────────  │
│                                 │  CHARACTER EDITOR    │
│                                 │  (when selected)     │
└─────────────────────────────────┴──────────────────────┘
```

Right column (`w-80 shrink-0`) stacks both panels with a gap. The right column is always rendered (previously only shown when a character was selected).

---

## Components

### `src/components/people/PeoplePanel.tsx`

Props:
```ts
{
  people: Person[];
  selectedCharId: string | null;
  onAssign: (person: Person) => Promise<void>;
  onPeopleChange: (people: Person[]) => void;
}
```

Behaviour:
- Renders a compact 3-column grid of `PersonCard` thumbnails + an "Add person" `+` tile
- Clicking a person card when `selectedCharId` is set → calls `onAssign(person)` immediately (no confirmation needed)
- Clicking a person card when no character is selected → expands `PersonForm` in edit mode for that person inline
- Clicking `+` → expands `PersonForm` in create mode
- Only one form open at a time

Visual states for person cards:
- Default: name + first photo thumbnail (or placeholder silhouette if no photos yet)
- Hover with character selected: subtle highlight + "Assign" label overlay

### `src/components/people/PersonForm.tsx`

Props:
```ts
{
  person?: Person;           // undefined = create mode
  onSave: (person: Person) => void;
  onDelete?: () => void;
  onClose: () => void;
}
```

Behaviour:
- Name input (required)
- Photo upload zone: same pattern as `CharacterEditor` — up to 3 photos, stored at `people/{personId}/ref-{n}.{ext}` using `supabase.storage`
- In create mode: clicking Save calls `createPerson`, then uploads any queued photos, then calls `onSave`
- In edit mode: name changes update via `updatePerson`; photo add/remove updates `referenceImageUrls` via `updatePerson`
- Delete button (edit mode only): calls `deletePerson`, removes storage files is a nice-to-have but not required

### `src/components/game-sets/CharacterEditor.tsx`

New prop: `assignedPerson?: Person | null` (computed by the page as `people.find(p => p.id === character.personId) ?? null`).

Add an "assigned person" section above the reference photos section:

- When `assignedPerson` is set: show `"👤 {assignedPerson.displayName}"` badge with an `×` unassign button
- Unassign: calls `updateCharacter(id, { personId: null })`, does not clear the reference photos
- No other changes — reference photo upload remains fully functional for one-off use

---

## Game Set Editor Page (`src/app/game-sets/[id]/page.tsx`)

Changes:
- Load `people` on mount alongside game set + characters: `listPeople()`
- Add `people` state: `useState<Person[]>([])`
- Right column always rendered (remove the `{selectedChar && ...}` wrapper around the column)
- Render `PeoplePanel` above `CharacterEditor` in the right column

### Assign handler

```ts
async function handleAssignPerson(person: Person) {
  if (!selectedId) return;
  await updateCharacter(selectedId, {
    referenceImageUrls: person.referenceImageUrls,
    personId: person.id,
  });
  setCharacters(prev =>
    prev.map(c => c.id === selectedId
      ? { ...c, referenceImageUrls: person.referenceImageUrls, personId: person.id }
      : c
    )
  );
}
```

---

## Assign Flow (end to end)

1. User opens game set editor
2. People panel always visible on the right, shows saved people
3. User clicks an empty character slot → Character Editor opens below People panel
4. User clicks "Kasper" in the People panel → `handleAssignPerson` runs:
   - Copies `kasper.referenceImageUrls` to the character
   - Sets `character.personId = kasper.id`
   - Saves to DB
   - UI updates immediately (no reload)
5. Character Editor now shows the Kasper badge above the reference photos
6. User adjusts outfit/accessories and clicks Generate → uses Kasper's photos

---

## Out of Scope

- Deleting storage files when a person is deleted (DB row deleted, orphaned files stay)
- Re-assigning all characters that share a person when the person's photos change
- Multi-user / auth (app is single-user)
- Searching / filtering the people panel (not needed below ~50 people)
