/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data } from "react-router";
import { middleware } from "~/http.server";
import { getAllRanks } from "~/models/rank-system.server";
import { getMetaTitle } from "~/root-meta";
import type { Route } from "./+types/ranks._index";

export const meta = getMetaTitle("Ranks");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  const ranks = await getAllRanks();

  return data({ ranks });
}

export default function Ranks({ loaderData }: Route.ComponentProps) {
  const { ranks } = loaderData;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black text-white drop-shadow-lg mb-2">
          🎖️ Ranks System
        </h1>
        <p className="text-neutral-400">
          Earn XP and climb the ranks! Total {ranks.length} ranks available.
        </p>
      </div>

      {/* Ranks Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ranks.map((rank, index) => {
          const isMaxRank = index === ranks.length - 1;
          const xpNeeded = rank.maxExperience - rank.minExperience;

          return (
            <div
              key={rank.id}
              className="group relative overflow-hidden rounded-xl border border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800 p-6 transition-all hover:scale-105 hover:border-neutral-600 hover:shadow-2xl"
              style={{
                boxShadow: `0 0 30px ${rank.rankColor}20`
              }}
            >
              {/* Rank Number Badge */}
              <div className="absolute top-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-xl font-black text-white">
                {index + 1}
              </div>

              {/* Glow Effect */}
              <div
                className="absolute inset-0 opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
                style={{
                  background: `radial-gradient(circle at center, ${rank.rankColor}, transparent 70%)`
                }}
              />

              {/* Content */}
              <div className="relative">
                {/* Rank Icon (placeholder, you can replace with actual icons) */}
                <div
                  className="mb-4 flex h-24 w-24 items-center justify-center rounded-full text-5xl"
                  style={{
                    backgroundColor: rank.rankColor + "20",
                    border: `3px solid ${rank.rankColor}`,
                    boxShadow: `0 0 20px ${rank.rankColor}50`
                  }}
                >
                  {index === 0 && "❓"}
                  {index > 0 && index <= 6 && "🥈"}
                  {index > 6 && index <= 10 && "🥇"}
                  {index > 10 && index <= 14 && "💎"}
                  {index > 14 && index <= 16 && "🦅"}
                  {index > 16 && "👑"}
                </div>

                {/* Rank Name */}
                <h2
                  className="mb-2 text-2xl font-black drop-shadow-lg"
                  style={{ color: rank.rankColor }}
                >
                  {rank.rankName}
                </h2>

                {/* Rank Tag */}
                <div className="mb-4">
                  <span
                    className="inline-block rounded-lg px-3 py-1 text-sm font-bold"
                    style={{
                      backgroundColor: rank.rankColor + "20",
                      color: rank.rankColor,
                      border: `1px solid ${rank.rankColor}50`
                    }}
                  >
                    {rank.rankTag}
                  </span>
                </div>

                {/* XP Requirements */}
                <div className="mb-4 space-y-2 rounded-lg bg-black/30 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Min XP:</span>
                    <span className="font-mono font-bold text-yellow-500">
                      {rank.minExperience.toLocaleString()}
                    </span>
                  </div>
                  {!isMaxRank && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Max XP:</span>
                      <span className="font-mono font-bold text-yellow-500">
                        {rank.maxExperience.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {isMaxRank && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Max XP:</span>
                      <span className="font-mono font-bold text-yellow-500">
                        ∞
                      </span>
                    </div>
                  )}
                  {!isMaxRank && (
                    <div className="flex justify-between border-t border-neutral-700 pt-2 text-sm">
                      <span className="text-neutral-400">XP Needed:</span>
                      <span className="font-mono font-bold text-orange-500">
                        {xpNeeded.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Player Count */}
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <span>👥</span>
                  <span>
                    <span className="font-bold text-white">{rank.playerCount}</span>{" "}
                    {rank.playerCount === 1 ? "player" : "players"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How to Earn XP Section */}
      <div className="mt-12 rounded-xl border border-neutral-700 bg-neutral-900/50 p-8">
        <h2 className="mb-4 text-2xl font-black text-white">📊 How to Earn XP</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-neutral-800/50 p-4">
            <div className="mb-2 text-3xl">💀</div>
            <h3 className="mb-1 font-bold text-white">Kills</h3>
            <p className="text-sm text-neutral-400">Each kill grants XP</p>
          </div>
          <div className="rounded-lg bg-neutral-800/50 p-4">
            <div className="mb-2 text-3xl">🎯</div>
            <h3 className="mb-1 font-bold text-white">Headshots</h3>
            <p className="text-sm text-neutral-400">Extra XP for headshots</p>
          </div>
          <div className="rounded-lg bg-neutral-800/50 p-4">
            <div className="mb-2 text-3xl">🏆</div>
            <h3 className="mb-1 font-bold text-white">Round Wins</h3>
            <p className="text-sm text-neutral-400">Win rounds for bonus XP</p>
          </div>
          <div className="rounded-lg bg-neutral-800/50 p-4">
            <div className="mb-2 text-3xl">⭐</div>
            <h3 className="mb-1 font-bold text-white">MVP</h3>
            <p className="text-sm text-neutral-400">MVP awards more XP</p>
          </div>
        </div>
      </div>
    </div>
  );
}
