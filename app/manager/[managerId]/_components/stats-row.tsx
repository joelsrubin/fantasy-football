export function StatsRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "positive" | "negative" | "gold";
}) {
  const highlightColors = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    gold: "text-amber-400 font-bold",
  };

  return (
    <div className="flex items-center justify-between px-6 py-3">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-semibold ${highlight ? highlightColors[highlight] : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}
