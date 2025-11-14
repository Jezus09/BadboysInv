/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, useLoaderData } from "react-router";
import { requireUser } from "~/auth.server";
import { useTranslate } from "~/components/app-context";
import type { Route } from "./+types/leaderboard._index";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return data({});
}

interface Player {
  steam_id: string;
  player_name: string;
  rank_name: string;
  rank_tag: string;
  rank_icon: string | null;
  rank_color: string;
  experience: number;
  kills: number;
  deaths: number;
  kd_ratio: number;
  headshot_percentage: number;
  playtime_hours: number;
}

export default function LeaderboardPage() {
  useLoaderData<typeof loader>();
  const translate = useTranslate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'experience' | 'kd_ratio' | 'kills'>('experience');

  useEffect(() => {
    setLoading(true);
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`/api/leaderboard?sortBy=${sortBy}&limit=50`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load leaderboard');
        }

        setPlayers(data.players);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [sortBy, translate]);

  const getMedalColor = (position: number) => {
    if (position === 1) return 'text-yellow-400';
    if (position === 2) return 'text-gray-300';
    if (position === 3) return 'text-orange-600';
    return 'text-neutral-400';
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  return (
    <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
      <div className="my-8">
        {/* Header */}
        <div className="mb-8 text-center">
          {/* Leaderboard Title */}
          <div className="relative mb-6">
            <h1 className="font-display text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-2xl">
              {translate("LeaderboardTitle")}
            </h1>
            <div className="absolute inset-0 text-6xl font-black text-yellow-400/20 blur-sm">
              {translate("LeaderboardTitle")}
            </div>
          </div>

          {/* Description */}
          <div className="text-center mb-4">
            <p className="font-display text-lg text-neutral-300 font-medium">
              {translate("LeaderboardDescription")}
            </p>
          </div>
        </div>

        {/* Sort Buttons */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={() => setSortBy('experience')}
            className={`font-display px-4 py-2 transition-all hover:bg-black/30 active:bg-black/70 ${
              sortBy === 'experience'
                ? 'bg-black/30 text-white'
                : 'text-neutral-400'
            }`}
          >
            {translate("LeaderboardSortByXP")}
          </button>
          <button
            onClick={() => setSortBy('kd_ratio')}
            className={`font-display px-4 py-2 transition-all hover:bg-black/30 active:bg-black/70 ${
              sortBy === 'kd_ratio'
                ? 'bg-black/30 text-white'
                : 'text-neutral-400'
            }`}
          >
            {translate("LeaderboardSortByKD")}
          </button>
          <button
            onClick={() => setSortBy('kills')}
            className={`font-display px-4 py-2 transition-all hover:bg-black/30 active:bg-black/70 ${
              sortBy === 'kills'
                ? 'bg-black/30 text-white'
                : 'text-neutral-400'
            }`}
          >
            {translate("LeaderboardSortByKills")}
          </button>
        </div>

        {loading && (
          <div className="text-center text-neutral-400 py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <span className="font-display">{translate("LeaderboardLoading")}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 text-center">
            <span className="font-display">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-lg overflow-hidden border border-neutral-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-800/80 border-b border-neutral-700">
                  <tr>
                    <th className="font-display px-4 py-3 text-left text-neutral-400 font-semibold">{translate("LeaderboardRank")}</th>
                    <th className="font-display px-4 py-3 text-left text-neutral-400 font-semibold">{translate("LeaderboardPlayer")}</th>
                    <th className="font-display px-4 py-3 text-left text-neutral-400 font-semibold">{translate("LeaderboardRankBadge")}</th>
                    <th className="font-display px-4 py-3 text-right text-neutral-400 font-semibold">{translate("LeaderboardXP")}</th>
                    <th className="font-display px-4 py-3 text-right text-neutral-400 font-semibold">{translate("LeaderboardKD")}</th>
                    <th className="font-display px-4 py-3 text-right text-neutral-400 font-semibold">{translate("LeaderboardKills")}</th>
                    <th className="font-display px-4 py-3 text-right text-neutral-400 font-semibold">{translate("LeaderboardHS")}</th>
                    <th className="font-display px-4 py-3 text-right text-neutral-400 font-semibold">{translate("LeaderboardPlaytime")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                {players.map((player, index) => (
                  <tr
                    key={player.steam_id}
                    className="hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className={`font-display px-4 py-4 font-bold ${getMedalColor(index + 1)}`}>
                      {getMedalEmoji(index + 1)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-display font-semibold text-white">{player.player_name}</div>
                      <div className="font-display text-xs text-neutral-500">{player.steam_id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {player.rank_icon && (
                          <img
                            src={`/images/ranks/${player.rank_icon}`}
                            alt={player.rank_name}
                            className="w-8 h-8 object-contain"
                          />
                        )}
                        <span
                          className="font-display text-xs font-bold"
                          style={{ color: player.rank_color }}
                        >
                          {player.rank_name}
                        </span>
                      </div>
                    </td>
                    <td className="font-display px-4 py-4 text-right font-bold text-white">
                      {player.experience.toLocaleString()}
                    </td>
                    <td className="font-display px-4 py-4 text-right text-neutral-300">
                      {player.kd_ratio.toFixed(2)}
                    </td>
                    <td className="font-display px-4 py-4 text-right text-neutral-300">
                      {player.kills.toLocaleString()}
                    </td>
                    <td className="font-display px-4 py-4 text-right text-neutral-300">
                      {player.headshot_percentage.toFixed(1)}%
                    </td>
                    <td className="font-display px-4 py-4 text-right text-neutral-300">
                      {player.playtime_hours.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {players.length === 0 && (
            <div className="text-center py-12 text-neutral-400">
              <span className="font-display">{translate("LeaderboardEmptyPlayers")}</span>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
