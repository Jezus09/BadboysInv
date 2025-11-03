/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, useLoaderData } from "react-router";
import { requireUser } from "~/auth.server";
import type { Route } from "./+types/admin._index";

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
  last_seen: string;
}

interface AdminLog {
  id: number;
  admin_steam_id: string;
  admin_name: string;
  target_steam_id: string;
  target_name: string;
  action: string;
  reason: string;
  timestamp: string;
}

export default function AdminPage() {
  useLoaderData<typeof loader>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'players' | 'logs'>('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'players') {
      fetchPlayers();
    } else {
      fetchAdminLogs();
    }
  }, [activeTab, searchQuery]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/players?search=${searchQuery}`);
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/logs');
      const data = await response.json();
      if (data.success) {
        setAdminLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setShowEditModal(true);
  };

  const handleUpdatePlayer = async (newXP: number) => {
    if (!selectedPlayer) return;

    try {
      const response = await fetch('/api/admin/update-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steam_id: selectedPlayer.steam_id,
          experience: newXP
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        fetchPlayers();
      }
    } catch (error) {
      console.error('Error updating player:', error);
    }
  };

  return (
    <div className="m-auto max-w-7xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">🛠️ Admin Panel</h1>
        <p className="text-neutral-400">Manage players, ranks, and view admin logs</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('players')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            activeTab === 'players'
              ? 'bg-blue-600 text-white'
              : 'bg-stone-800 text-neutral-400 hover:bg-stone-700'
          }`}
        >
          👥 Players
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white'
              : 'bg-stone-800 text-neutral-400 hover:bg-stone-700'
          }`}
        >
          📝 Admin Logs
        </button>
      </div>

      {/* Players Tab */}
      {activeTab === 'players' && (
        <>
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by name or Steam ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-stone-800 text-white rounded-lg border border-stone-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Players Table */}
          {loading ? (
            <div className="text-center text-neutral-400 py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              Loading players...
            </div>
          ) : (
            <div className="bg-stone-900/50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-800 border-b border-stone-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-neutral-400 font-semibold">Player</th>
                      <th className="px-4 py-3 text-left text-neutral-400 font-semibold">Rank</th>
                      <th className="px-4 py-3 text-right text-neutral-400 font-semibold">XP</th>
                      <th className="px-4 py-3 text-right text-neutral-400 font-semibold">K/D</th>
                      <th className="px-4 py-3 text-right text-neutral-400 font-semibold">Last Seen</th>
                      <th className="px-4 py-3 text-center text-neutral-400 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {players.map((player) => (
                      <tr key={player.steam_id} className="hover:bg-stone-800/50 transition-colors">
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
                        <td className="px-4 py-4 text-right text-neutral-300 text-sm">
                          {new Date(player.last_seen).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleEditPlayer(player)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                          >
                            Edit
                          </button>
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
        </>
      )}

      {/* Admin Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-stone-900/50 rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-center text-neutral-400 py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              Loading logs...
            </div>
          ) : (
            <div className="divide-y divide-stone-800">
              {adminLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-stone-800/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-white">{log.admin_name}</span>
                      <span className="text-neutral-400 mx-2">→</span>
                      <span className="text-orange-400 font-medium">{log.action}</span>
                      <span className="text-neutral-400 mx-2">→</span>
                      <span className="text-white">{log.target_name}</span>
                    </div>
                    <span className="text-xs text-neutral-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {log.reason && (
                    <div className="text-sm text-neutral-400">
                      Reason: {log.reason}
                    </div>
                  )}
                </div>
              ))}

              {adminLogs.length === 0 && (
                <div className="text-center py-12 text-neutral-400">
                  No admin logs found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Player Modal */}
      {showEditModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-stone-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              Edit Player: {selectedPlayer.player_name}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-neutral-400 mb-2">Current XP</label>
                <div className="text-2xl font-bold text-white">
                  {selectedPlayer.experience.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-2">New XP</label>
                <input
                  type="number"
                  defaultValue={selectedPlayer.experience}
                  id="newXP"
                  className="w-full px-4 py-2 bg-stone-900 text-white rounded border border-stone-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    const input = document.getElementById('newXP') as HTMLInputElement;
                    handleUpdatePlayer(parseInt(input.value));
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Update
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
