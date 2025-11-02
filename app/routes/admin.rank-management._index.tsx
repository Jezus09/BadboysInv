/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, redirect } from "react-router";
import { middleware } from "~/http.server";
import { isUserOwner } from "~/models/rule";
import { getRequestUserId } from "~/auth.server";
import { getMetaTitle } from "~/root-meta";
import type { Route } from "./+types/admin.rank-management._index";

export const meta = getMetaTitle("Admin - Rank Management");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  const userId = await getRequestUserId(request);
  const isOwner = await isUserOwner(userId);

  if (!isOwner) {
    throw redirect("/?error=AccessDenied");
  }

  return data({});
}

interface PlayerData {
  steamId: string;
  playerName: string;
  rankId: number;
  experience: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  rank: {
    rankName: string;
    rankTag: string;
    rankColor: string;
  };
}

interface BanData {
  id: string;
  steamId: string;
  bannedBy: string;
  reason: string;
  bannedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

interface AdminData {
  steamId: string;
  adminRole: string;
  flags: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminLogData {
  id: string;
  adminSteamId: string;
  actionType: string;
  targetSteamId: string | null;
  actionDetails: string | null;
  createdAt: string;
}

export default function AdminRankManagement() {
  const [activeTab, setActiveTab] = useState<"players" | "bans" | "admins" | "logs">("players");
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [bans, setBans] = useState<BanData[]>([]);
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [logs, setLogs] = useState<AdminLogData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showXPModal, setShowXPModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);

  // Form states
  const [xpAmount, setXpAmount] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("");
  const [newAdminSteamId, setNewAdminSteamId] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("moderator");
  const [newAdminFlags, setNewAdminFlags] = useState("");

  useEffect(() => {
    if (activeTab === "players") fetchPlayers();
    else if (activeTab === "bans") fetchBans();
    else if (activeTab === "admins") fetchAdmins();
    else if (activeTab === "logs") fetchLogs();
  }, [activeTab]);

  async function fetchPlayers() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/rank-players?limit=500");
      const data = await response.json();
      setPlayers(data.players || []);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBans() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/bans");
      const data = await response.json();
      setBans(data.bans || []);
    } catch (error) {
      console.error("Error fetching bans:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAdmins() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/admins");
      const data = await response.json();
      setAdmins(data.admins || []);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/logs?limit=200");
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGiveXP() {
    if (!selectedPlayer || !xpAmount) return;

    try {
      const response = await fetch("/api/admin/give-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steamId: selectedPlayer.steamId,
          xpAmount: parseInt(xpAmount)
        })
      });

      if (response.ok) {
        alert(`Gave ${xpAmount} XP to ${selectedPlayer.playerName}`);
        setShowXPModal(false);
        setXpAmount("");
        fetchPlayers();
      }
    } catch (error) {
      console.error("Error giving XP:", error);
      alert("Failed to give XP");
    }
  }

  async function handleBanPlayer() {
    if (!selectedPlayer || !banReason) return;

    try {
      const expiresAt = banDuration
        ? new Date(Date.now() + parseInt(banDuration) * 60000).toISOString()
        : undefined;

      const response = await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steamId: selectedPlayer.steamId,
          reason: banReason,
          expiresAt
        })
      });

      if (response.ok) {
        alert(`Banned ${selectedPlayer.playerName}`);
        setShowBanModal(false);
        setBanReason("");
        setBanDuration("");
        fetchPlayers();
      }
    } catch (error) {
      console.error("Error banning player:", error);
      alert("Failed to ban player");
    }
  }

  async function handleUnbanPlayer(steamId: string) {
    if (!confirm("Are you sure you want to unban this player?")) return;

    try {
      const response = await fetch("/api/admin/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamId })
      });

      if (response.ok) {
        alert("Player unbanned");
        fetchBans();
      }
    } catch (error) {
      console.error("Error unbanning player:", error);
      alert("Failed to unban player");
    }
  }

  async function handleAddAdmin() {
    if (!newAdminSteamId || !newAdminRole) return;

    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steamId: newAdminSteamId,
          adminRole: newAdminRole,
          flags: newAdminFlags
        })
      });

      if (response.ok) {
        alert("Admin added successfully");
        setShowAddAdminModal(false);
        setNewAdminSteamId("");
        setNewAdminRole("moderator");
        setNewAdminFlags("");
        fetchAdmins();
      }
    } catch (error) {
      console.error("Error adding admin:", error);
      alert("Failed to add admin");
    }
  }

  const filteredPlayers = players.filter(
    (p) =>
      p.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.steamId.includes(searchQuery)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">
          🛡️ Rank System Management
        </h1>
        <p className="text-neutral-400">Manage players, bans, and admins</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-neutral-700">
        <button
          onClick={() => setActiveTab("players")}
          className={`px-6 py-3 font-bold transition-colors ${
            activeTab === "players"
              ? "border-b-2 border-yellow-500 text-yellow-500"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Players ({players.length})
        </button>
        <button
          onClick={() => setActiveTab("bans")}
          className={`px-6 py-3 font-bold transition-colors ${
            activeTab === "bans"
              ? "border-b-2 border-red-500 text-red-500"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Bans ({bans.length})
        </button>
        <button
          onClick={() => setActiveTab("admins")}
          className={`px-6 py-3 font-bold transition-colors ${
            activeTab === "admins"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Admins ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-6 py-3 font-bold transition-colors ${
            activeTab === "logs"
              ? "border-b-2 border-green-500 text-green-500"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Logs ({logs.length})
        </button>
      </div>

      {/* Players Tab */}
      {activeTab === "players" && (
        <div>
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or Steam ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-white placeholder-neutral-500 focus:border-yellow-500 focus:outline-none"
            />
          </div>

          {/* Players Table */}
          {loading ? (
            <div className="text-center py-8 text-neutral-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-700 bg-neutral-900/50">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-800/50">
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Player</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Rank</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-neutral-300">XP</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-neutral-300">K/D</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-neutral-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => (
                    <tr key={player.steamId} className="border-b border-neutral-700/50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-semibold text-white">{player.playerName}</div>
                          <div className="text-xs text-neutral-500">{player.steamId}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded px-2 py-1 text-xs font-bold"
                          style={{
                            backgroundColor: player.rank.rankColor + "20",
                            color: player.rank.rankColor,
                            border: `1px solid ${player.rank.rankColor}50`
                          }}
                        >
                          {player.rank.rankTag}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-yellow-500">
                        {player.experience.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">
                        {player.kdRatio.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedPlayer(player);
                            setShowXPModal(true);
                          }}
                          className="mr-2 rounded bg-yellow-600 px-3 py-1 text-sm font-bold text-white hover:bg-yellow-700"
                        >
                          Give XP
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPlayer(player);
                            setShowBanModal(true);
                          }}
                          className="rounded bg-red-600 px-3 py-1 text-sm font-bold text-white hover:bg-red-700"
                        >
                          Ban
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bans Tab */}
      {activeTab === "bans" && (
        <div>
          {loading ? (
            <div className="text-center py-8 text-neutral-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-700 bg-neutral-900/50">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-800/50">
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Steam ID</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Banned By</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Expires</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-neutral-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bans.map((ban) => (
                    <tr key={ban.id} className="border-b border-neutral-700/50">
                      <td className="px-4 py-3 font-mono text-sm text-white">{ban.steamId}</td>
                      <td className="px-4 py-3 text-sm text-neutral-300">{ban.reason}</td>
                      <td className="px-4 py-3 font-mono text-sm text-neutral-400">{ban.bannedBy}</td>
                      <td className="px-4 py-3 text-sm text-neutral-400">
                        {ban.expiresAt
                          ? new Date(ban.expiresAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleUnbanPlayer(ban.steamId)}
                          className="rounded bg-green-600 px-3 py-1 text-sm font-bold text-white hover:bg-green-700"
                        >
                          Unban
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === "admins" && (
        <div>
          <div className="mb-4">
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
            >
              + Add Admin
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-neutral-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-700 bg-neutral-900/50">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-800/50">
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Steam ID</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Flags</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-neutral-300">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.steamId} className="border-b border-neutral-700/50">
                      <td className="px-4 py-3 font-mono text-sm text-white">{admin.steamId}</td>
                      <td className="px-4 py-3 text-sm text-blue-400">{admin.adminRole}</td>
                      <td className="px-4 py-3 font-mono text-sm text-neutral-400">{admin.flags || "-"}</td>
                      <td className="px-4 py-3 text-sm text-neutral-400">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div>
          {loading ? (
            <div className="text-center py-8 text-neutral-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-sm text-neutral-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-blue-400">{log.adminSteamId}</span>
                        <span className="mx-2 text-neutral-500">→</span>
                        <span className="rounded bg-yellow-900/30 px-2 py-1 text-sm font-bold text-yellow-500">
                          {log.actionType}
                        </span>
                        {log.targetSteamId && (
                          <>
                            <span className="mx-2 text-neutral-500">→</span>
                            <span className="font-mono text-sm text-white">{log.targetSteamId}</span>
                          </>
                        )}
                      </div>
                      {log.actionDetails && (
                        <div className="mt-1 text-sm text-neutral-400">{log.actionDetails}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* XP Modal */}
      {showXPModal && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">
              Give XP to {selectedPlayer.playerName}
            </h2>
            <input
              type="number"
              placeholder="XP Amount"
              value={xpAmount}
              onChange={(e) => setXpAmount(e.target.value)}
              className="mb-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleGiveXP}
                className="flex-1 rounded bg-yellow-600 py-2 font-bold text-white hover:bg-yellow-700"
              >
                Give XP
              </button>
              <button
                onClick={() => setShowXPModal(false)}
                className="flex-1 rounded bg-neutral-700 py-2 font-bold text-white hover:bg-neutral-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">
              Ban {selectedPlayer.playerName}
            </h2>
            <input
              type="text"
              placeholder="Ban Reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="mb-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-white"
            />
            <input
              type="number"
              placeholder="Duration (minutes, empty = permanent)"
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value)}
              className="mb-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleBanPlayer}
                className="flex-1 rounded bg-red-600 py-2 font-bold text-white hover:bg-red-700"
              >
                Ban Player
              </button>
              <button
                onClick={() => setShowBanModal(false)}
                className="flex-1 rounded bg-neutral-700 py-2 font-bold text-white hover:bg-neutral-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Add New Admin</h2>
            <input
              type="text"
              placeholder="Steam ID"
              value={newAdminSteamId}
              onChange={(e) => setNewAdminSteamId(e.target.value)}
              className="mb-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-white"
            />
            <select
              value={newAdminRole}
              onChange={(e) => setNewAdminRole(e.target.value)}
              className="mb-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-white"
            >
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <input
              type="text"
              placeholder="Flags (optional)"
              value={newAdminFlags}
              onChange={(e) => setNewAdminFlags(e.target.value)}
              className="mb-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddAdmin}
                className="flex-1 rounded bg-blue-600 py-2 font-bold text-white hover:bg-blue-700"
              >
                Add Admin
              </button>
              <button
                onClick={() => setShowAddAdminModal(false)}
                className="flex-1 rounded bg-neutral-700 py-2 font-bold text-white hover:bg-neutral-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
