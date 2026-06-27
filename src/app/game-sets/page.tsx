"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listGameSets, deleteGameSet } from "@/lib/supabase/db";
import type { GameSet } from "@/types/game";
import { ALL_THEMES, getThemeConfig } from "@/lib/game-engine/themes";

const STATUS_COLORS: Record<GameSet["status"], string> = {
  draft: "bg-gray-700 text-gray-300",
  ready_for_generation: "bg-blue-900 text-blue-300",
  generating: "bg-yellow-900 text-yellow-300",
  ready_for_review: "bg-purple-900 text-purple-300",
  approved: "bg-green-900 text-green-300",
  exported: "bg-teal-900 text-teal-300",
};

export default function GameSetsPage() {
  const [sets, setSets] = useState<GameSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setSets(await listGameSets());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await deleteGameSet(id);
    setSets((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Game Sets</h1>
        <Link
          href="/game-sets/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Set
        </Link>
      </div>

      {sets.length === 0 ? (
        <div className="border border-dashed border-gray-700 rounded-xl p-12 text-center text-gray-500">
          <p className="text-lg mb-2">No game sets yet.</p>
          <Link href="/game-sets/new" className="text-indigo-400 hover:underline">
            Create your first set →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {sets.map((set) => (
            <div
              key={set.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-lg">{set.title}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[set.status]}`}>
                      {set.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {getThemeConfig(set.theme).label} · {set.characterCount} characters ·{" "}
                    Updated {new Date(set.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/game-sets/${set.id}`}
                  className="text-sm text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded border border-indigo-800 hover:border-indigo-600 transition-colors"
                >
                  Open
                </Link>
                <button
                  onClick={() => handleDelete(set.id, set.title)}
                  className="text-sm text-red-500 hover:text-red-400 px-3 py-1.5 rounded border border-red-900 hover:border-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
