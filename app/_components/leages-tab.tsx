import { useMyLeagues } from "@/lib/hooks/use-fantasy-data";
import { LeagueCard } from "./league-card";

export function LeaguesTab() {
  const { data: seasons, isLoading, error } = useMyLeagues();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <span className="text-zinc-400">Loading your leagues...</span>
        </div>
      </div>
    );
  }

  if (error) {
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
          <h2 className="mb-2 text-xl font-semibold text-white">Error Loading Leagues</h2>
          <p className="mb-6 text-zinc-400">{error.message}</p>
          <p className="text-sm text-zinc-500">
            Make sure you&apos;ve run{" "}
            <code className="rounded bg-zinc-800 px-2 py-1">pnpm run setup-yahoo</code>
          </p>
        </div>
      </div>
    );
  }

  if (!seasons || seasons.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-6">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <svg
              className="h-8 w-8 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">No Leagues Found</h2>
          <p className="text-zinc-400">No NFL fantasy leagues found for your account.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Summary */}
      <div className="mb-8 text-center">
        <p className="text-zinc-400">
          {seasons.length} seasons • {seasons.reduce((acc, s) => acc + s.leagues.length, 0)} leagues
        </p>
      </div>

      {/* Seasons */}
      <div className="space-y-10">
        {seasons.map((season) => (
          <div key={season.season}>
            {/* Season Header */}
            <div className="mb-4 flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">{season.season}</h2>
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-400">
                {season.leagues.length} league{season.leagues.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* League Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {season.leagues.map((league) => (
                <LeagueCard key={league.leagueKey} league={league} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
