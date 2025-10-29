/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RankBadge } from "./rank-badge";
import type { K4PlayerStats } from "~/models/k4system.server";

interface PlayerStatsSectionProps {
  stats: K4PlayerStats | null;
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  gradient: string;
}

function StatCard({ icon, label, value, subtitle, color, gradient }: StatCardProps) {
  return (
    <div className={`group rounded-lg border border-neutral-600/30 bg-gradient-to-br ${gradient} p-4 hover:border-${color}-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-${color}-500/20`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`text-2xl group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className="text-xs text-neutral-400 uppercase tracking-wide">{label}</div>
      </div>
      <div className={`text-3xl font-black text-${color}-400 drop-shadow-lg group-hover:text-${color}-300 transition-colors`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-neutral-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

export function PlayerStatsSection({ stats }: PlayerStatsSectionProps) {
  if (!stats) {
    return (
      <div className="mt-6 rounded-lg border border-neutral-600/30 bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 p-8">
        <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
          <span className="text-4xl">📊</span>
          <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            CS2 Server Statistics
          </span>
        </h2>
        <div className="text-center py-12 text-neutral-400">
          <div className="text-6xl mb-4">🎮</div>
          <div className="text-lg">No server statistics available for this player</div>
          <div className="text-sm mt-2">Play on the server to see your stats here!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-neutral-600/30 bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 p-6">
      <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
        <span className="text-4xl">📊</span>
        <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
          CS2 Server Statistics
        </span>
      </h2>

      {/* Rank Badge - Center & Large */}
      {stats.rankName && (
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 blur-3xl animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 rounded-2xl p-8 border border-neutral-700/50">
              <RankBadge rankName={stats.rankName} points={stats.rankPoints} size="large" />
            </div>
          </div>
        </div>
      )}

      {/* Main Combat Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-neutral-300 mb-3 flex items-center gap-2">
          <span>⚔️</span> Combat Statistics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon="🎯"
            label="Kills"
            value={stats.kills.toLocaleString()}
            color="green"
            gradient="from-neutral-900/90 to-green-900/20"
          />
          <StatCard
            icon="💀"
            label="Deaths"
            value={stats.deaths.toLocaleString()}
            color="red"
            gradient="from-neutral-900/90 to-red-900/20"
          />
          <StatCard
            icon="⚡"
            label="K/D Ratio"
            value={stats.kd}
            color="blue"
            gradient="from-neutral-900/90 to-blue-900/20"
          />
          <StatCard
            icon="🤝"
            label="Assists"
            value={stats.assists.toLocaleString()}
            color="purple"
            gradient="from-neutral-900/90 to-purple-900/20"
          />
        </div>
      </div>

      {/* Accuracy Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-neutral-300 mb-3 flex items-center gap-2">
          <span>🎪</span> Accuracy & Precision
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            icon="🔥"
            label="Headshots"
            value={stats.headshots.toLocaleString()}
            subtitle={`${stats.headshotPercentage}% HS Rate`}
            color="yellow"
            gradient="from-neutral-900/90 to-yellow-900/20"
          />
          <StatCard
            icon="🎯"
            label="Accuracy"
            value={`${stats.accuracy}%`}
            subtitle={`${stats.shotsHit}/${stats.shotsFired} shots`}
            color="cyan"
            gradient="from-neutral-900/90 to-cyan-900/20"
          />
          <StatCard
            icon="💥"
            label="Damage"
            value={stats.damageDealt.toLocaleString()}
            subtitle="Total damage dealt"
            color="orange"
            gradient="from-neutral-900/90 to-orange-900/20"
          />
        </div>
      </div>

      {/* Performance Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-neutral-300 mb-3 flex items-center gap-2">
          <span>🏆</span> Performance
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon="🌟"
            label="MVPs"
            value={stats.mvps}
            color="amber"
            gradient="from-neutral-900/90 to-amber-900/20"
          />
          <StatCard
            icon="📈"
            label="Win Rate"
            value={`${stats.winRate}%`}
            subtitle={`${stats.roundsWon}W / ${stats.roundsLost}L`}
            color="green"
            gradient="from-neutral-900/90 to-emerald-900/20"
          />
          <StatCard
            icon="🎮"
            label="Rounds"
            value={stats.roundsPlayed}
            subtitle="Total played"
            color="indigo"
            gradient="from-neutral-900/90 to-indigo-900/20"
          />
          <StatCard
            icon="💣"
            label="Bombs"
            value={stats.bombPlanted + stats.bombDefused}
            subtitle={`${stats.bombPlanted}P / ${stats.bombDefused}D`}
            color="rose"
            gradient="from-neutral-900/90 to-rose-900/20"
          />
        </div>
      </div>

      {/* Playtime Card - Special Design */}
      <div className="relative overflow-hidden rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-900/30 via-cyan-900/20 to-blue-900/30 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/10 to-blue-500/5 animate-pulse"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-5xl">⏱️</div>
            <div>
              <div className="text-sm text-neutral-400 uppercase tracking-wide mb-1">
                Total Playtime
              </div>
              <div className="text-4xl font-black text-blue-400 drop-shadow-lg">
                {stats.playtimeFormatted}
              </div>
            </div>
          </div>
          {stats.lastConnect && (
            <div className="text-right">
              <div className="text-sm text-neutral-400 uppercase tracking-wide mb-1">
                Last Seen
              </div>
              <div className="text-lg font-bold text-cyan-400">
                {new Date(stats.lastConnect).toLocaleDateString("hu-HU", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
