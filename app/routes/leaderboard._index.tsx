/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { data } from "react-router";
import { middleware } from "~/http.server";
import { getLeaderboard } from "~/models/rank-system.server";
import { getMetaTitle } from "~/root-meta";
import type { Route } from "./+types/leaderboard._index";

export const meta = getMetaTitle("Leaderboard");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  const url = new URL(request.url);
  const type = (url.searchParams.get("type") || "rank") as "rank" | "kills" | "kd";

  const leaderboard = await getLeaderboard(type, 100);

  return data({ leaderboard, type });
}

export default function Leaderboard({ loaderData }: Route.ComponentProps) {
  const { leaderboard: initialLeaderboard, type: initialType } = loaderData;
  const [selectedType, setSelectedType] = useState<"rank" | "kills" | "kd">(initialType);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [loading, setLoading] = useState(false);

  async function handleTypeChange(type: "rank" | "kills" | "kd") {
    setSelectedType(type);
    setLoading(true);
    try {
      const response = await fetch(`/api/leaderboard?type=${type}&limit=100`);
      const data = await response.json();
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black text-white drop-shadow-lg mb-2">
          🏆 Leaderboard
        </h1>
        <p className="text-neutral-400">Top 100 Players</p>
      </div>

      {/* Type Selector */}
      <div className="mb-6 flex justify-center gap-4">
        <button
          onClick={() => handleTypeChange("rank")}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            selectedType === "rank"
              ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          By Rank
        </button>
        <button
          onClick={() => handleTypeChange("kills")}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            selectedType === "kills"
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          By Kills
        </button>
        <button
          onClick={() => handleTypeChange("kd")}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            selectedType === "kd"
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          By K/D Ratio
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-yellow-500"></div>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-neutral-700 bg-neutral-900/50 backdrop-blur-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-700 bg-neutral-800/50">
                <th className="px-6 py-4 text-left text-sm font-bold text-neutral-300">Rank</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-neutral-300">Player</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-neutral-300">Rank</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-neutral-300">XP</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-neutral-300">Kills</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-neutral-300">Deaths</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-neutral-300">K/D</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-neutral-300">HS%</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player) => (
                <tr
                  key={player.steamId}
                  className="border-b border-neutral-700/50 transition-colors hover:bg-neutral-800/30"
                >
                  {/* Position */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {player.position === 1 && (
                        <span className="text-2xl">🥇</span>
                      )}
                      {player.position === 2 && (
                        <span className="text-2xl">🥈</span>
                      )}
                      {player.position === 3 && (
                        <span className="text-2xl">🥉</span>
                      )}
                      <span className="font-bold text-white">
                        #{player.position}
                      </span>
                    </div>
                  </td>

                  {/* Player Name */}
                  <td className="px-6 py-4">
                    <a
                      href={`/profile/${player.steamId}`}
                      className="font-semibold text-white hover:text-yellow-500 transition-colors"
                    >
                      {player.playerName}
                    </a>
                  </td>

                  {/* Rank */}
                  <td className="px-6 py-4">
                    <span
                      className="inline-block rounded px-3 py-1 text-sm font-bold"
                      style={{
                        backgroundColor: player.rankColor + "20",
                        color: player.rankColor,
                        border: `1px solid ${player.rankColor}50`
                      }}
                    >
                      {player.rankTag}
                    </span>
                  </td>

                  {/* XP */}
                  <td className="px-6 py-4 text-right font-mono text-yellow-500">
                    {player.experience.toLocaleString()}
                  </td>

                  {/* Kills */}
                  <td className="px-6 py-4 text-right font-mono text-red-400">
                    {player.kills.toLocaleString()}
                  </td>

                  {/* Deaths */}
                  <td className="px-6 py-4 text-right font-mono text-neutral-400">
                    {player.deaths.toLocaleString()}
                  </td>

                  {/* K/D Ratio */}
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-mono font-bold ${
                        player.kdRatio >= 2
                          ? "text-green-400"
                          : player.kdRatio >= 1
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {player.kdRatio.toFixed(2)}
                    </span>
                  </td>

                  {/* Headshot % */}
                  <td className="px-6 py-4 text-right font-mono text-orange-400">
                    {player.headshotPercentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {leaderboard.length === 0 && (
            <div className="py-12 text-center text-neutral-400">
              No players found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
