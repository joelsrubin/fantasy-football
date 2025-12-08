import Link from "next/link";
import type { League } from "@/db/schema";

export function LeagueCard({ league }: { league: League }) {
  const isCurrent = league.season === new Date().getFullYear().toString();

  return (
    <Link
      href={`/league/${league.leagueKey}`}
      className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-violet-500/50 hover:bg-zinc-900"
    >
      {/* Current Season Badge */}
      {isCurrent && (
        <div className="absolute right-4 top-14">
          <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-400">
            Current
          </span>
        </div>
      )}

      {/* League Info */}
      <div className="mb-4 flex items-start gap-4">
        {league.logoUrl && league.logoUrl !== "0" ? (
          <picture>
            <img
              src={league.logoUrl}
              alt={league.name}
              className="h-14 w-14 rounded-xl bg-zinc-800 object-cover"
            />
          </picture>
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
            <svg
              className="h-7 w-7 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate group-hover:text-violet-400 transition-colors">
            {league.name}
          </h3>
          <p className="text-sm text-zinc-500">{league.numTeams} teams</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
        <div className="text-sm">
          <span className="text-zinc-500">Week </span>
          <span className="font-semibold text-white">{league.currentWeek}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-zinc-500 group-hover:text-violet-400 transition-colors">
          View League
          <svg
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
