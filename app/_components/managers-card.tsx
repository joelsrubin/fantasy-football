import { ChevronRight, FileQuestion } from "lucide-react";
import Link from "next/link";
import type { ManagerWithTeams } from "@/db/schema";

export function ManagersCard({ manager }: { manager: ManagerWithTeams }) {
  return (
    <Link
      //TODO: replace when manager pages get built
      href={`/`}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-violet-500/50 hover:bg-zinc-900"
    >
      <div className="flex items-center gap-4">
        {manager.imageUrl && manager.imageUrl !== "0" ? (
          // biome-ignore lint/performance/noImgElement: ok
          <img
            src={manager.imageUrl}
            alt={manager.nickname}
            className="h-14 w-14 rounded-xl bg-zinc-800 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
            <FileQuestion className="h-6 w-6 text-zinc-400" />
          </div>
        )}
        <div>
          <h3 className="truncate font-semibold text-white transition-colors group-hover:text-violet-400">
            {manager.nickname}
          </h3>
          <p className="text-sm text-zinc-500">
            {manager.teams.length} {manager.teams.length === 1 ? "team" : "teams"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm text-zinc-500 transition-colors group-hover:text-violet-400">
        View League
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
