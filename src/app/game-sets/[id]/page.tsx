"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
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
import { evaluateDeck } from "@/lib/game-engine/balance";
import { generateCharacterPrompt } from "@/lib/game-engine/prompts";
import type { GameSet, Character, CharacterAttributes, ImageStyle, Person } from "@/types/game";
import { IMAGE_STYLE_CONFIGS } from "@/lib/image-generation/styles";
import CharacterCard from "@/components/game-sets/CharacterCard";
import CharacterEditor from "@/components/game-sets/CharacterEditor";
import BalanceScoreBadge from "@/components/game-sets/BalanceScoreBadge";
import PeoplePanel from "@/components/people/PeoplePanel";

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
  const [people, setPeople] = useState<Person[]>([]);

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

  async function runGenerationLoop(chars: Character[]) {
    setIsGeneratingAll(true);
    setGenerateAllProgress({ done: 0, total: chars.length, failed: 0, failedIds: [] });

    let failed = 0;
    const failedIds: string[] = [];

    for (const char of chars) {
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
        total: chars.length,
        failed,
        failedIds: [...failedIds],
      }));
    }

    setGeneratingCharId(null);
    setIsGeneratingAll(false);
  }

  async function handleGenerateAll() {
    if (!gameSet) return;
    const eligible = characters.filter((c) => c.referenceImageUrls.length > 0);
    if (eligible.length === 0) return;
    await runGenerationLoop(eligible);
  }

  async function handleRetryFailed() {
    if (!generateAllProgress || !gameSet) return;
    const toRetry = characters.filter((c) =>
      generateAllProgress.failedIds.includes(c.id)
    );
    if (toRetry.length === 0) return;
    await runGenerationLoop(toRetry);
  }

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
              <span>Generating {generateAllProgress.done + 1} / {generateAllProgress.total}…</span>
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

      {/* Right: People panel (always) + Character editor (when selected) */}
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
}
