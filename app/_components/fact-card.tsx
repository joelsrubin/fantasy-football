import type { ReactElement } from "react";
import type { FunFact } from "@/lib/hooks/use-fantasy-data";

export function FactCard({
  fact,
  config,
}: {
  fact: FunFact;
  config: {
    title: string;
    icon: ReactElement;
    bgColors: string;
    iconBg: string;
    iconRing: string;
    iconColor: string;
    gradientRight: string;
    gradientLeft: string;
    marginBg: string;
    marginColor: string;
  };
}) {
  const sub =
    fact.type === "longestWinStreak"
      ? `${fact.year}: From week ${fact.startWeek} to ${fact.endWeek}`
      : `${fact.isPlayoff ? "Playoff" : "Regular Season"} • Week ${fact.week}, ${fact.year}`;

  return (
    <div
      key={`${fact.type}-${fact.week}-${fact.year}`}
      className={`group relative overflow-hidden rounded-2xl border border-zinc-800 bg-linear-to-br ${config.bgColors}`}
    >
      {/* Background decoration */}
      <div
        className={`absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl transition-all ${config.gradientRight}`}
      />
      <div
        className={`absolute -bottom-8 -left-8 h-32 w-32 rounded-full blur-2xl transition-all ${config.gradientLeft}`}
      />

      <div className="relative p-6">
        {/* Card Header */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${config.iconBg} ring-1 ${config.iconRing}`}
          >
            <svg
              className={`h-6 w-6 ${config.iconColor}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              {config.icon}
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{config.title}</h3>
            <p className="text-sm text-zinc-500">{sub}</p>
          </div>
        </div>

        {/* Matchup Display or Win Streak Display */}
        {fact.type === "longestWinStreak" ? (
          <div className="mb-6 rounded-xl bg-zinc-800/50 p-4 text-center">
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/50">
              <svg
                className="h-5 w-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
              </svg>
            </div>
            <p className="mb-1 font-semibold text-white">{fact.team}</p>
            <p className="text-2xl font-bold text-emerald-400">{fact.streak}</p>
            <p className="text-xs text-emerald-500/80">Consecutive Wins</p>
          </div>
        ) : (
          <div className="mb-6 rounded-xl bg-zinc-800/50 p-4">
            <div className="flex flex-col md:flex-row space-y-4 items-center justify-between">
              {/* Winner */}
              <div className="flex-1 text-center mb-0">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/50">
                  <svg
                    className="h-5 w-5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="mb-1 truncate font-semibold text-white">{fact.winner.name}</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {fact.winner.points.toFixed(2)}
                </p>
                <p className="text-xs text-emerald-500/80">Winner</p>
              </div>

              {/* VS Divider */}
              <div className="mx-4 flex flex-col items-center">
                <div className="rounded-full bg-zinc-700/50 px-3 py-1 text-xs font-medium text-zinc-400">
                  VS
                </div>
              </div>

              {/* Loser */}
              <div className="flex-1 text-center">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 ring-2 ring-red-500/50">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="mb-1 truncate font-semibold text-white">{fact.loser.name}</p>
                <p className="text-2xl font-bold text-red-400">{fact.loser.points.toFixed(2)}</p>
                <p className="text-xs text-red-500/80">Loser</p>
              </div>
            </div>
          </div>
        )}

        {/* Margin Highlight */}
        {fact.type !== "longestWinStreak" && (
          <div
            className={`flex items-center justify-center gap-2 rounded-lg bg-linear-to-r ${config.marginBg} px-4 py-3`}
          >
            <svg
              className={`h-5 w-5 ${config.marginColor}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
              />
            </svg>
            <span className="text-sm font-medium text-zinc-400">Margin of Victory:</span>
            <span className={`text-lg font-bold ${config.marginColor}`}>
              {fact.margin.toFixed(2)} pts
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
