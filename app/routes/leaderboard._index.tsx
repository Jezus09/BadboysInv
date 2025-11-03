/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, useLoaderData } from "react-router";
import { requireUser } from "~/auth.server";
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'experience' | 'kd_ratio' | 'kills'>('experience');

  useEffect(() => {
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
  }, [sortBy]);

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
    <div className="m-auto max-w-7xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">🏅 Leaderboard</h1>
        <p className="text-neutral-400">Top players on the server</p>
      </div>

      <div className="mb-6 flex justify-center gap-2">
        <button
          onClick={() => setSortBy('experience')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            sortBy === 'experience'
              ? 'bg-blue-600 text-white'
              : 'bg-stone-800 text-neutral-400 hover:bg-stone-700'
          }`}
        >
          By XP
        </button>
        <button
          onClick={() => setSortBy('kd_ratio')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            sortBy === 'kd_ratio'
              ? 'bg-blue-600 text-white'
              : 'bg-stone-800 text-neutral-400 hover:bg-stone-700'
          }`}
        >
          By K/D
        </button>
        <button
          onClick={() => setSortBy('kills')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            sortBy === 'kills'
              ? 'bg-blue-600 text-white'
              : 'bg-stone-800 text-neutral-400 hover:bg-stone-700'
          }`}
        >
          By Kills
        </button>
      </div>

      {loading && (
        <div className="text-center text-neutral-400 py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          Loading leaderboard...
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 text-center">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-stone-900/50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-800 border-b border-stone-700">
                <tr>
                  <th className="px-4 py-3 text-left text-neutral-400 font-semibold">Rank</th>
                  <th className="px-4 py-3 text-left text-neutral-400 font-semibold">Player</th>
                  <th className="px-4 py-3 text-left text-neutral-400 font-semibold">Tier</th>
                  <th className="px-4 py-3 text-right text-neutral-400 font-semibold">XP</th>
                  <th className="px-4 py-3 text-right text-neutral-400 font-semibold">K/D</th>
                  <th className="px-4 py-3 text-right text-neutral-400 font-semibold">Kills</th>
                  <th className="px-4 py-3 text-right text-neutral-400 font-semibold">HS%</th>
                  <th className="px-4 py-3 text-right text-neutral-400 font-semibold">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {players.map((player, index) => (
                  <tr
                    key={player.steam_id}
                    className="hover:bg-stone-800/50 transition-colors"
                  >
                    <td className={`px-4 py-4 font-bold ${getMedalColor(index + 1)}`}>
                      {getMedalEmoji(index + 1)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">{player.player_name}</div>
                      <div className="text-xs text-neutral-500">{player.steam_id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="px-2 py-1 rounded text-xs font-bold"
                        style={{
                          backgroundColor: `${player.rank_color}20`,
                          color: player.rank_color
                        }}
                      >
                        {player.rank_tag}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-white">
                      {player.experience.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-neutral-300">
                      {player.kd_ratio.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-right text-neutral-300">
                      {player.kills.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-neutral-300">
                      {player.headshot_percentage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-4 text-right text-neutral-300">
                      {player.playtime_hours.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {players.length === 0 && (
            <div className="text-center py-12 text-neutral-400">
              No players found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
