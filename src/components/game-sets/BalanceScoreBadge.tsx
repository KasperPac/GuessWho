export default function BalanceScoreBadge({
  score,
  isPlayable,
}: {
  score: number;
  isPlayable: boolean;
}) {
  const color =
    score >= 70
      ? "bg-green-900 text-green-300"
      : score >= 50
      ? "bg-yellow-900 text-yellow-300"
      : "bg-red-900 text-red-300";

  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${color}`}>
      {score}/100 {isPlayable ? "✓ playable" : "✗ not playable"}
    </span>
  );
}
