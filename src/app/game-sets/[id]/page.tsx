"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  getGameSet,
  listCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  saveBalanceReport,
} from "@/lib/supabase/db";
import { evaluateDeck } from "@/lib/game-engine/balance";
import { generateCharacterPrompt } from "@/lib/game-engine/prompts";
import type { GameSet, Character, CharacterAttributes } from "@/types/game";
import { GAMEPLAY_TRAITS } from "@/lib/game-engine/attributes";
import CharacterCard from "@/components/game-sets/CharacterCard";
import CharacterEditor from "@/components/game-sets/CharacterEditor";
import BalanceScoreBadge from "@/components/game-sets/BalanceScoreBadge";

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

    // Generate and save prompt
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

  async function handleDeleteCharacter(charId: string) {
    await deleteCharacter(charId);
    const updated = characters.filter((c) => c.id !== charId);
    setCharacters(updated);
    if (selectedId === charId) setSelectedId(null);
    runBalance(updated);
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (!gameSet) return <p className="text-red-400">Game set not found.</p>;

  const selectedChar = characters.find((c) => c.id === selectedId) ?? null;

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
          <div className="flex gap-2">
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

        <div className="grid grid-cols-4 gap-3">
          {characters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              selected={char.id === selectedId}
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
          />
        </div>
      )}
    </div>
  );
}
