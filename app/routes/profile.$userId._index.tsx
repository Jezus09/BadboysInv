/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data, redirect, useLoaderData } from "react-router";
import { middleware } from "~/http.server";
import { getMetaTitle } from "~/root-meta";
import { Modal, ModalHeader } from "~/components/modal";
import { prisma } from "~/db.server";
import { parseInventory, createFakeInventoryItemFromBase } from "~/utils/inventory";
import { CS2Inventory } from "@ianlucas/cs2-lib";
import { ItemImage } from "~/components/item-image";
import { inventoryMaxItems, inventoryStorageUnitMaxItems } from "~/models/rule.server";
import { getK4PlayerStats } from "~/models/k4system.server";
import type { Route } from "./+types/profile.$userId._index";

export const meta = getMetaTitle("Player Profile");

export async function loader({ params, request }: Route.LoaderArgs) {
  await middleware(request);

  const userId = params.userId;

  if (!userId) {
    throw redirect("/");
  }

  // Fetch user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatar: true,
      createdAt: true,
      inventory: true,
      coins: true,
      caseOpenings: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          caseName: true,
          unlockedName: true,
          unlockedRarity: true,
          createdAt: true
        }
      }
    }
  });

  if (!user) {
    throw redirect("/?error=UserNotFound");
  }

  // Parse inventory
  let inventoryItems: any[] = [];
  if (user.inventory) {
    try {
      const inventoryData = parseInventory(user.inventory);
      const maxItems = await inventoryMaxItems.for(userId).get();
      const storageMaxItems = await inventoryStorageUnitMaxItems.for(userId).get();

      const inventory = new CS2Inventory({
        data: inventoryData,
        maxItems,
        storageUnitMaxItems: storageMaxItems
      });

      const items = JSON.parse(inventory.stringify()).items || {};
      inventoryItems = Object.entries(items).map(([uid, item]: [string, any]) => ({
        uid: parseInt(uid),
        ...item
      }));
    } catch (error) {
      console.error("Failed to parse inventory:", error);
    }
  }

  // Fetch K4System statistics
  // userId is the Steam ID (format: 76561199513508022)
  const k4Stats = await getK4PlayerStats(userId);

  return data({
    user: {
      ...user,
      coins: user.coins?.toString() || "0"
    },
    inventoryItems,
    k4Stats
  });
}

export default function PlayerProfile() {
  const { user, inventoryItems, k4Stats } = useLoaderData<typeof loader>();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <Modal className="w-[95%] max-w-[1200px] max-h-[90vh]">
      <ModalHeader title="Player Profile" linkTo="/" />

      <div className="mt-4 px-4 pb-4 overflow-y-auto max-h-[80vh]">
        {/* Profile Header */}
        <div className="rounded-sm border border-neutral-500/20 bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 p-6 mb-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <img
              src={user.avatar}
              alt={user.name}
              className="w-32 h-32 rounded-sm border-2 border-neutral-500/30"
            />

            {/* Player Info */}
            <div className="flex-1">
              <h1 className="font-display text-4xl font-black text-white mb-2">
                {user.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Joined:</span>
                  <span className="text-white">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Balance:</span>
                  <span className="text-green-400 font-bold">${user.coins}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Items:</span>
                  <span className="text-blue-400 font-bold">{inventoryItems.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Section */}
          <div className="rounded-sm border border-neutral-500/20 bg-neutral-800/50 p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-blue-400">🎒</span>
              Inventory ({inventoryItems.length} items)
            </h2>

            {inventoryItems.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
                {inventoryItems.slice(0, 20).map((item) => {
                  const inventoryItem = createFakeInventoryItemFromBase(item);
                  return (
                    <div
                      key={item.uid}
                      className="rounded-sm border border-neutral-500/20 bg-black/40 p-2 hover:border-neutral-400/40 transition-colors"
                    >
                      <ItemImage
                        item={inventoryItem}
                        className="w-full h-16 object-contain mb-1"
                      />
                      <div className="text-xs text-neutral-400 truncate text-center">
                        {inventoryItem.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                No items in inventory
              </div>
            )}

            {inventoryItems.length > 20 && (
              <div className="mt-3 text-center text-sm text-neutral-500">
                + {inventoryItems.length - 20} more items
              </div>
            )}
          </div>

          {/* Recent Case Openings */}
          <div className="rounded-sm border border-neutral-500/20 bg-neutral-800/50 p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-yellow-400">📦</span>
              Recent Case Openings
            </h2>

            {user.caseOpenings.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {user.caseOpenings.map((opening) => (
                  <div
                    key={opening.id}
                    className="rounded-sm border border-neutral-500/20 bg-black/40 p-3 hover:border-neutral-400/40 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm text-neutral-400">{opening.caseName}</span>
                      <span className="text-xs text-neutral-500">
                        {new Date(opening.createdAt).toLocaleDateString("hu-HU")}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-white">
                      {opening.unlockedName}
                    </div>
                    {opening.unlockedRarity && (
                      <div className={`text-xs mt-1 ${
                        opening.unlockedRarity === "legendary" ? "text-red-400" :
                        opening.unlockedRarity === "mythical" ? "text-purple-400" :
                        opening.unlockedRarity === "rare" ? "text-blue-400" :
                        "text-neutral-400"
                      }`}>
                        {opening.unlockedRarity}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                No case openings yet
              </div>
            )}
          </div>
        </div>

        {/* CS2 Server Statistics */}
        <div className="mt-6 rounded-sm border border-neutral-500/20 bg-neutral-800/50 p-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-green-400">📊</span>
            CS2 Server Statistics
          </h2>

          {k4Stats ? (
            <div className="space-y-4">
              {/* Rank and Points */}
              {k4Stats.rankName && (
                <div className="rounded-sm border border-yellow-500/20 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-neutral-400">Rank</div>
                      <div className="text-2xl font-bold text-yellow-400">{k4Stats.rankName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-neutral-400">Points</div>
                      <div className="text-2xl font-bold text-orange-400">{k4Stats.rankPoints}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {/* Kills */}
                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Kills</div>
                  <div className="text-2xl font-bold text-green-400">{k4Stats.kills}</div>
                </div>

                {/* Deaths */}
                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Deaths</div>
                  <div className="text-2xl font-bold text-red-400">{k4Stats.deaths}</div>
                </div>

                {/* K/D Ratio */}
                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">K/D Ratio</div>
                  <div className="text-2xl font-bold text-blue-400">{k4Stats.kd}</div>
                </div>

                {/* Assists */}
                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Assists</div>
                  <div className="text-2xl font-bold text-purple-400">{k4Stats.assists}</div>
                </div>

                {/* Headshots */}
                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Headshots</div>
                  <div className="text-2xl font-bold text-yellow-400">{k4Stats.headshots}</div>
                  <div className="text-xs text-neutral-500 mt-1">{k4Stats.headshotPercentage}%</div>
                </div>

                {/* Accuracy */}
                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Accuracy</div>
                  <div className="text-2xl font-bold text-cyan-400">{k4Stats.accuracy}%</div>
                  <div className="text-xs text-neutral-500 mt-1">{k4Stats.shotsHit}/{k4Stats.shotsFired}</div>
                </div>

                {/* MVPs */}
                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">MVPs</div>
                  <div className="text-2xl font-bold text-orange-400">{k4Stats.mvps}</div>
                </div>

                {/* Win Rate */}
                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Win Rate</div>
                  <div className="text-2xl font-bold text-green-400">{k4Stats.winRate}%</div>
                  <div className="text-xs text-neutral-500 mt-1">{k4Stats.roundsWon}W / {k4Stats.roundsLost}L</div>
                </div>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Rounds Played</div>
                  <div className="text-lg font-bold text-white">{k4Stats.roundsPlayed}</div>
                </div>

                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Bombs Planted</div>
                  <div className="text-lg font-bold text-white">{k4Stats.bombPlanted}</div>
                </div>

                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Bombs Defused</div>
                  <div className="text-lg font-bold text-white">{k4Stats.bombDefused}</div>
                </div>

                <div className="rounded-sm border border-neutral-500/20 bg-black/40 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Damage Dealt</div>
                  <div className="text-lg font-bold text-white">{k4Stats.damageDealt.toLocaleString()}</div>
                </div>
              </div>

              {/* Playtime */}
              <div className="rounded-sm border border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-400">Total Playtime</div>
                    <div className="text-2xl font-bold text-blue-400">{k4Stats.playtimeFormatted}</div>
                  </div>
                  {k4Stats.lastConnect && (
                    <div className="text-right">
                      <div className="text-sm text-neutral-400">Last Seen</div>
                      <div className="text-sm text-cyan-400">
                        {new Date(k4Stats.lastConnect).toLocaleDateString("hu-HU")}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-400">
              No server statistics available for this player
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
