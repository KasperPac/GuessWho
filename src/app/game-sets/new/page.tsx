"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGameSet } from "@/lib/supabase/db";
import { ALL_THEMES, getThemeConfig } from "@/lib/game-engine/themes";
import type { GameTheme } from "@/types/game";

export default function NewGameSetPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState<GameTheme>("classic_office");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const set = await createGameSet({ title: title.trim(), theme });
      router.push(`/game-sets/${set.id}`);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">New Game Set</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dev Team Farewell Pack"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Theme</label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_THEMES.map((t) => {
              const config = getThemeConfig(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                    theme === t
                      ? "border-indigo-500 bg-indigo-950 text-white"
                      : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <p className="font-medium text-sm">{config.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {saving ? "Creating…" : "Create Set"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-300 px-4 py-2.5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
