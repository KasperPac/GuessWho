import { listCharacters, getGameSet } from "@/lib/supabase/db";
import type { Character } from "@/types/game";

// Server component — rendered at request time, optimised for printing.

export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [gameSet, characters] = await Promise.all([
    getGameSet(id),
    listCharacters(id),
  ]);

  if (!gameSet) return <p>Game set not found.</p>;

  // Pad to 24 slots
  const slots: (Character | null)[] = [
    ...characters,
    ...Array(Math.max(0, 24 - characters.length)).fill(null),
  ];

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; background: white; }
          .no-print { display: none !important; }
          .print-grid { page-break-inside: avoid; }
        }
        .card {
          width: 63mm;
          height: 88mm;
          border: 1px solid #ccc;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: white;
          color: black;
        }
        .card-image {
          flex: 1;
          background: #eee;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
        }
        .card-footer {
          padding: 4px 6px;
          border-top: 1px solid #ddd;
          text-align: center;
        }
        .card-name {
          font-size: 11px;
          font-weight: bold;
          font-family: sans-serif;
        }
        .print-grid {
          display: grid;
          grid-template-columns: repeat(6, 63mm);
          gap: 4mm;
          padding: 10mm;
          background: white;
        }
      `}</style>

      <div className="no-print mb-4 flex items-center gap-4 print:hidden">
        <a href={`/game-sets/${id}`} className="text-indigo-400 hover:underline text-sm">
          ← Back to Set
        </a>
        <h1 className="text-lg font-bold text-black">{gameSet.title} — Print View</h1>
        <button
          onClick={() => window.print()}
          className="bg-black text-white px-4 py-1.5 rounded text-sm"
        >
          Print
        </button>
      </div>

      <div className="print-grid">
        {slots.map((char, i) => (
          <div key={char?.id ?? `empty-${i}`} className="card">
            <div className="card-image">
              {char?.generatedImageUrl || char?.referenceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={char.generatedImageUrl ?? char.referenceImageUrl!}
                  alt={char.displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                "👤"
              )}
            </div>
            <div className="card-footer">
              <p className="card-name">{char?.displayName ?? ""}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
