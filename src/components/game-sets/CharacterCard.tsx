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
