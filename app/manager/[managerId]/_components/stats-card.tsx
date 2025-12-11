export function StatCard({
  icon,
  label,
  value,
  color,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "emerald" | "red" | "amber" | "blue" | "orange" | "violet";
  highlight?: boolean;
}) {
  const bgColors = {
    emerald: "from-emerald-500/10 to-emerald-500/5",
    red: "from-red-500/10 to-red-500/5",
    amber: "from-amber-500/10 to-amber-500/5",
    blue: "from-blue-500/10 to-blue-500/5",
    orange: "from-orange-500/10 to-orange-500/5",
    violet: "from-violet-500/10 to-violet-500/5",
  };

  const borderColors = {
    emerald: "border-emerald-500/30",
    red: "border-red-500/30",
    amber: "border-amber-500/30",
    blue: "border-blue-500/30",
    orange: "border-orange-500/30",
    violet: "border-violet-500/30",
  };

  return (
    <div
      className={`rounded-xl border bg-linear-to-br p-4 ${bgColors[color]} ${highlight ? borderColors[color] : "border-zinc-800"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
