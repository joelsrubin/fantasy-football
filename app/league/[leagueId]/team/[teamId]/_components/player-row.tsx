import { useWindowSize } from "@/lib/hooks/use-window.size";
import type { YahooRosterPlayer } from "@/lib/yahoo-fantasy";

const positionColors: Record<string, string> = {
  QB: "bg-red-500/20 text-red-400 border-red-500/30",
  RB: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  WR: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  TE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DEF: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  FLEX: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  W_R_T: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  BN: "bg-zinc-600/20 text-zinc-500 border-zinc-600/30",
  IR: "bg-zinc-700/20 text-zinc-600 border-zinc-700/30",
};
export function PlayerRow({ player }: { player: YahooRosterPlayer }) {
  const position = player.selected_position?.position || player.display_position;
  const displayPosition = position === "W_R_T" ? "FLEX" : position;
  const positionClass = positionColors[position] || positionColors.BN;

  const { isMobile } = useWindowSize();

  return (
    <div className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-800/30">
      {/* Position Badge */}
      <div
        className={`flex h-10 w-14 items-center justify-center rounded-lg border font-bold text-xs ${positionClass}`}
      >
        {displayPosition}
      </div>

      {/* Player Info */}
      <div className="flex flex-1 items-center gap-4">
        {player.headshot?.url && !isMobile && (
          <picture>
            <img
              src={player.headshot.url}
              alt={player.name.full}
              className="h-10 w-10 rounded-full bg-zinc-800 object-cover"
            />
          </picture>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white truncate">{player.name.full}</span>
            {player.status && (
              <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-medium text-red-400">
                {player.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>{player.editorial_team_abbr}</span>
            <span>•</span>
            <span>{player.display_position}</span>
            {player.bye_weeks?.week && (
              <>
                <span>•</span>
                <span className="text-zinc-600">BYE: Week {player.bye_weeks.week}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Points */}
      <div className="text-right">
        <div className="text-xl font-bold text-white">
          {player.player_points?.total?.toFixed(2) || "0.00"}
        </div>
        <div className="text-xs text-zinc-500">pts</div>
      </div>
    </div>
  );
}
