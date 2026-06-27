"use client";

import { useState } from "react";
import type { Character, CharacterAttributes, GameSet } from "@/types/game";
import { generateCharacterPrompt } from "@/lib/game-engine/prompts";
import {
  HAIR_LENGTHS, HAIR_COLORS, HAIR_TEXTURES, FACIAL_HAIRS,
  GLASSES, HATS, EYE_COLORS, EXPRESSIONS, TOP_COLORS,
  OUTFIT_TYPES, ACCESSORIES,
} from "@/lib/game-engine/attributes";

type Updates = Partial<Pick<Character, "displayName" | "attributes">>;

const SELECT_CLASS =
  "w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 capitalize";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={SELECT_CLASS}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace(/_/g, " ")}
        </option>
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
}: {
  character: Character;
  gameSet: GameSet;
  onSave: (updates: Updates) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(character.displayName);
  const [attrs, setAttrs] = useState<CharacterAttributes>({ ...character.attributes });
  const [saving, setSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  function setAttr<K extends keyof CharacterAttributes>(
    key: K,
    value: CharacterAttributes[K]
  ) {
    setAttrs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ displayName: name, attributes: attrs });
    setSaving(false);
  }

  const previewPrompt = generateCharacterPrompt(
    { ...character, displayName: name, attributes: attrs },
    gameSet
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4 sticky top-8">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Edit Character</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">
          ×
        </button>
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

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "Saving…" : "Save"}
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
