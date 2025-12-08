import Link from "next/link";
import type { StandingEntry } from "@/lib/hooks/use-fantasy-data";
import { useWindowSize } from "@/lib/hooks/use-window.size";

export function StandingsTable({
  standings,
  leagueId,
}: {
  standings: StandingEntry[];
  leagueId: string;
}) {
  const { isMobile } = useWindowSize();

  if (standings.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
        No standings data available
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-800/30 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">League Standings</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Team</th>
              <th className="px-6 py-4 text-center">W</th>
              {!isMobile && (
                <>
                  <th className="px-6 py-4 text-center">L</th>
                  <th className="px-6 py-4 text-center">T</th>
                  <th className="px-6 py-4 text-right">Win %</th>
                  <th className="px-6 py-4 text-right">PF</th>
                  <th className="px-6 py-4 text-right">PA</th>
                  <th className="px-6 py-4 text-right">Diff</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {standings.map((standing, index) => {
              const rank = standing.standings?.rank || index + 1;
              const isPlayoff = rank <= 6;
              const pointsDiff =
                (standing.standings?.pointsFor || 0) - (standing.standings?.pointsAgainst || 0);

              return (
                <tr key={standing.teamKey} className="transition-colors hover:bg-zinc-800/30">
                  <td className="px-4 py-4">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        rank === 1
                          ? "bg-amber-500/20 text-amber-400"
                          : rank === 2
                            ? "bg-zinc-400/20 text-zinc-300"
                            : rank === 3
                              ? "bg-orange-600/20 text-orange-400"
                              : isPlayoff
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {rank}
                    </div>
                  </td>
                  <td className="max-w-[200px] px-6 py-4 sm:max-w-[300px]">
                    <Link
                      href={`/league/${leagueId}/team/${standing.teamId}`}
                      className="group flex items-center gap-3"
                    >
                      {standing.logoUrl && (
                        <picture>
                          <img
                            src={standing.logoUrl}
                            alt={standing.name}
                            className="h-10 min-w-10 w-10 shrink-0 rounded-lg bg-zinc-800 object-cover"
                          />
                        </picture>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white group-hover:text-violet-400 transition-colors">
                          {standing.name}
                        </div>
                        {standing.manager?.nickname && (
                          <div className="truncate text-xs text-zinc-500">
                            {standing.manager.nickname}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-emerald-400">
                    {standing.standings?.wins || 0}
                  </td>
                  {!isMobile && (
                    <>
                      <td className="px-6 py-4 text-center font-semibold text-red-400">
                        {standing.standings?.losses || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-zinc-500">
                        {standing.standings?.ties || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-zinc-300">
                        {((standing.standings?.winPct || 0) * 100).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-white">
                        {standing.standings?.pointsFor?.toFixed(1) || "0.0"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-zinc-400">
                        {standing.standings?.pointsAgainst?.toFixed(1) || "0.0"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-semibold ${
                            pointsDiff > 0
                              ? "text-emerald-400"
                              : pointsDiff < 0
                                ? "text-red-400"
                                : "text-zinc-500"
                          }`}
                        >
                          {pointsDiff > 0 ? "+" : ""}
                          {pointsDiff.toFixed(1)}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
