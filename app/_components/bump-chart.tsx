"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  type LegendPayload,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { DataKey } from "recharts/types/util/types";
import { useWeeklyRankings, type WeeklyRankingData } from "@/lib/hooks/use-weekly-rankings";

interface BumpChartProps {
  leagueId: string; // This can be either database ID or league key
}

export function BumpChart({ leagueId }: BumpChartProps) {
  const { data, isLoading, error } = useWeeklyRankings(leagueId);

  const [hoveringDataKey, setHoveringDataKey] = useState<DataKey<string> | undefined>(undefined);
  const handleMouseEnter = (payload: LegendPayload) => {
    setHoveringDataKey(payload.dataKey);
  };

  const handleMouseLeave = () => {
    setHoveringDataKey(undefined);
  };
  if (isLoading) {
    return (
      <div className="rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4">Manager Rankings Throughout Season</h3>
        <div className="h-[400px] bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !data?.weeklyRankings) {
    return (
      <div className=" rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4">Manager Rankings Throughout Season</h3>
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          {error ? "Failed to load ranking data" : "No ranking data available"}
        </div>
      </div>
    );
  }

  const weeklyRankings: WeeklyRankingData[] = data.weeklyRankings;

  // Get all unique weeks and managers
  const weeks = [...new Set(weeklyRankings.map((w) => w.week))].sort((a, b) => a - b);
  const managers = [
    ...new Set(
      weeklyRankings.flatMap((w: WeeklyRankingData) => w.rankings.map((r) => r.managerName)),
    ),
  ];

  // Create a map of manager to their weekly ranks
  const managerRanks = new Map<string, number[]>();

  // Initialize with null values for missing weeks
  managers.forEach((manager) => {
    managerRanks.set(manager, Array(weeks.length).fill(null));
  });

  // Fill in the ranks
  weeklyRankings.forEach(({ week, rankings }: WeeklyRankingData) => {
    const weekIndex = weeks.indexOf(week);
    rankings.forEach((ranking) => {
      const ranks = managerRanks.get(ranking.managerName) || [];
      ranks[weekIndex] = ranking.rank;
      managerRanks.set(ranking.managerName, ranks);
    });
  });

  // Create the chart data structure for Recharts
  const chartData = weeks.map((week, weekIndex) => {
    const weekData: { week: number } & Record<string, number | null> = { week };
    managerRanks.forEach((ranks, manager) => {
      weekData[manager] = ranks[weekIndex];
    });
    return weekData;
  });

  // Get the latest week for sorting
  const latestWeek = Math.max(...weeks);

  // Define a color palette
  const COLORS = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
    "#aec7e8",
    "#ffbb78",
    "#98df8a",
    "#ff9896",
    "#c5b0d5",
    "#c49c94",
    "#f7b6d2",
    "#c7c7c7",
    "#dbdb8d",
    "#9edae5",
  ];

  // Sort managers by their latest rank for consistent coloring
  const sortedManagers = [...managers].sort((a, b) => {
    const aRank = managerRanks.get(a)?.find((_r, i) => weeks[i] === latestWeek) || Infinity;
    const bRank = managerRanks.get(b)?.find((_r, i) => weeks[i] === latestWeek) || Infinity;
    return aRank - bRank;
  });

  return (
    <div className="border border-zinc-700 bg-zinc-800/50 text-zinc-400 rounded-lg p-6 shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Manager Rankings Throughout Season</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Lower numbers indicate better rankings. Week {weeks[0] || 1} to Week {latestWeek}
        </p>
      </div>
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            width={"100%"}
            height={"100%"}
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis
              dataKey="week"
              tick={{ fill: "#9CA3AF" }}
              tickLine={{ stroke: "#4B5563" }}
              axisLine={{ stroke: "#4B5563" }}
              label={{ value: "Week", position: "insideBottomRight", offset: -5, fill: "#9CA3AF" }}
            />
            <YAxis
              reversed
              domain={[1, "dataMax + 1"]}
              tick={{ fill: "#9CA3AF" }}
              tickLine={{ stroke: "#4B5563" }}
              axisLine={{ stroke: "#4B5563" }}
              label={{
                value: "Rank",
                angle: -90,
                position: "insideLeft",
                fill: "#9CA3AF",
                style: { textAnchor: "middle" },
              }}
              tickCount={
                Math.max(...Array.from(managerRanks.values()).flatMap((r) => r.filter(Boolean))) + 1
              }
            />

            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="left"
              wrapperStyle={{
                paddingTop: "20px",
                color: "#9CA3AF",
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
            {sortedManagers.map((manager, index) => (
              <Line
                key={manager}
                type="monotone"
                dataKey={manager}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={4}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name={manager}
                isAnimationActive={false}
                opacity={hoveringDataKey === manager || hoveringDataKey === undefined ? 1 : 0.25}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
