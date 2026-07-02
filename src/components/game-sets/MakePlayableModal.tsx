"use client";

import { useEffect, useRef } from "react";
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
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isApplying) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isApplying, onCancel]);

  useEffect(() => {
    confirmButtonRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="make-playable-title"
      >
        <h2 id="make-playable-title" className="text-lg font-bold mb-1">Make Playable</h2>
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
            ref={confirmButtonRef}
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
