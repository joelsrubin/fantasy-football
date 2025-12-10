import { useFunFacts } from "@/lib/hooks/use-fantasy-data";
import { FactCard } from "./fact-card";

export function StatsTab() {
  const { data: funFacts, isLoading, error } = useFunFacts();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <span className="text-zinc-400">Loading fun facts...</span>
        </div>
      </div>
    );
  }

  if (error || !funFacts) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-6">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">Error Loading Stats</h2>
          <p className="text-zinc-400">
            {error?.message || "Unable to load fun facts. Try again later."}
          </p>
        </div>
      </div>
    );
  }

  const getCardConfig = (type: string) => {
    if (type === "biggestBlowout") {
      return {
        title: "Biggest Blowout",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        ),
        bgColors: "from-zinc-900 via-zinc-900 to-red-950/20",
        iconBg: "from-red-500/20 to-orange-500/20",
        iconRing: "ring-red-500/30",
        iconColor: "text-red-400",
        gradientRight: "bg-red-500/5",
        gradientLeft: "bg-orange-500/5",
        marginBg: "from-red-500/10 via-orange-500/10 to-red-500/10",
        marginColor: "text-orange-400",
      };
    }
    if (type === "longestWinStreak") {
      return {
        title: "Longest Win Streak",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
          />
        ),
        bgColors: "from-zinc-900 via-zinc-900 to-emerald-950/20",
        iconBg: "from-emerald-500/20 to-green-500/20",
        iconRing: "ring-emerald-500/30",
        iconColor: "text-emerald-400",
        gradientRight: "bg-emerald-500/5",
        gradientLeft: "bg-green-500/5",
        marginBg: "from-emerald-500/10 via-green-500/10 to-emerald-500/10",
        marginColor: "text-green-400",
      };
    }
    // closestMatchup
    return {
      title: "Closest Matchup",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
      bgColors: "from-zinc-900 via-zinc-900 to-blue-950/20",
      iconBg: "from-blue-500/20 to-cyan-500/20",
      iconRing: "ring-blue-500/30",
      iconColor: "text-blue-400",
      gradientRight: "bg-blue-500/5",
      gradientLeft: "bg-cyan-500/5",
      marginBg: "from-blue-500/10 via-cyan-500/10 to-blue-500/10",
      marginColor: "text-cyan-400",
    };
  };

  const winStreakFact = funFacts?.[2];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-zinc-400">League records and memorable moments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 lg:grid-cols-2 grid-cols-1">
        {funFacts.slice(0, 2).map((fact) => {
          const config = getCardConfig(fact.type);
          return (
            <FactCard key={`${fact.type}-${fact.week}-${fact.year}`} fact={fact} config={config} />
          );
        })}
        {winStreakFact ? (
          <FactCard
            key={`longestWinStreak-${winStreakFact.week}-${winStreakFact.year}`}
            fact={winStreakFact}
            config={getCardConfig("longestWinStreak")}
          />
        ) : (
          <p className="text-zinc-500">Loading...</p>
        )}
      </div>

      {/* Coming Soon Section */}
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
          <svg
            className="h-6 w-6 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
        <h3 className="mb-1 text-lg font-semibold text-zinc-400">More Stats Coming Soon</h3>
        <p className="text-sm text-zinc-600">Highest scores, longest win streaks, and more!</p>
      </div>
    </div>
  );
}
