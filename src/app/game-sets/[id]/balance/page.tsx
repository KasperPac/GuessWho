"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { listCharacters } from "@/lib/supabase/db";
import { evaluateDeck } from "@/lib/game-engine/balance";
import type { Character, DeckBalanceReport, TraitDistribution, TraitUsefulness } from "@/types/game";

const SEVERITY_COLORS = {
  critical: "bg-red-950 border-red-800 text-red-300",
  warning: "bg-yellow-950 border-yellow-800 text-yellow-300",
  info: "bg-gray-900 border-gray-700 text-gray-400",
};

const USEFULNESS_COLORS = {
  good: "text-green-400",
  okay: "text-yellow-400",
  poor: "text-red-400",
};

export default function BalanceReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [report, setReport] = useState<DeckBalanceReport | null>(null);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    listCharacters(id).then((chars) => {
      setCharacters(chars);
      const map: Record<string, string> = {};
      chars.forEach((c) => { map[c.id] = c.displayName; });
      setNameMap(map);
      if (chars.length > 0) setReport(evaluateDeck(chars));
    });
  }, [id]);

  if (!report) return <p className="text-gray-500">Loading…</p>;

  // Group trait distributions by trait
  const byTrait = new Map<string, typeof report.traitDistribution>();
  for (const d of report.traitDistribution) {
    const list = byTrait.get(d.trait) ?? [];
    list.push(d);
    byTrait.set(d.trait, list);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/game-sets/${id}`} className="text-gray-500 hover:text-gray-300 text-sm">
          ← Back to Set
        </Link>
        <h1 className="text-2xl font-bold">Balance Report</h1>
      </div>

      {/* Score */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-6">
        <div
          className={`text-5xl font-black tabular-nums ${
            report.isPlayable ? "text-green-400" : report.score >= 50 ? "text-yellow-400" : "text-red-400"
          }`}
        >
          {report.score}
          <span className="text-2xl text-gray-500">/100</span>
        </div>
        <div>
          <p className={`text-lg font-semibold ${report.isPlayable ? "text-green-400" : "text-red-400"}`}>
            {report.isPlayable ? "✓ Deck is playable" : "✗ Deck is not playable"}
          </p>
          <p className="text-sm text-gray-500">{characters.length}/24 characters</p>
        </div>
      </div>

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Warnings</h2>
          <div className="space-y-2">
            {report.warnings.map((w, i) => (
              <div
                key={i}
                className={`border rounded-lg px-4 py-3 text-sm ${SEVERITY_COLORS[w.severity]}`}
              >
                <span className="uppercase text-xs font-bold mr-2 opacity-70">{w.severity}</span>
                {w.message}
                {w.affectedCharacterIds && w.affectedCharacterIds.length > 0 && (
                  <span className="ml-2 opacity-70">
                    ({w.affectedCharacterIds.map((cid) => nameMap[cid] ?? cid).join(", ")})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar pairs */}
      {report.similarPairs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Similar Pairs</h2>
          <div className="space-y-2">
            {report.similarPairs.map((pair, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">
                    {nameMap[pair.characterAId]} & {nameMap[pair.characterBId]}
                  </span>
                  <span
                    className={`font-bold ${
                      pair.similarityScore >= 80 ? "text-red-400" : "text-yellow-400"
                    }`}
                  >
                    {pair.similarityScore}% similar
                  </span>
                </div>
                <p className="text-gray-500 text-xs">
                  Shared: {pair.sharedTraits.join(", ") || "none"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trait distribution table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Trait Distribution</h2>
        <div className="space-y-4">
          {([...byTrait.entries()] as [string, TraitDistribution[]][]).map(([trait, entries]) => (
            <div key={trait} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 capitalize">
                {trait.replace(/([A-Z])/g, " $1")}
              </h3>
              <div className="space-y-1.5">
                {entries.map((d: TraitDistribution) => (
                  <div key={d.value} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-gray-400 capitalize shrink-0">
                      {d.value.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-gray-400">{d.count}</span>
                    <span className={`w-10 text-xs ${USEFULNESS_COLORS[d.usefulness as TraitUsefulness]}`}>
                      {d.usefulness}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested fixes */}
      {report.suggestedFixes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Suggested Fixes</h2>
          <div className="space-y-2">
            {report.suggestedFixes.map((fix, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm">
                <p className="font-medium mb-0.5">
                  {nameMap[fix.characterId]} — {fix.trait}:{" "}
                  <span className="text-red-400">{fix.currentValue}</span> →{" "}
                  <span className="text-green-400">{fix.suggestedValue}</span>
                </p>
                <p className="text-gray-500 text-xs">{fix.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
