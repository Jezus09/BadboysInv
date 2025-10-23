/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, redirect, useLoaderData } from "react-router";
import { middleware } from "~/http.server";
import { isUserOwner } from "~/models/rule";
import { getRequestUserId } from "~/auth.server";
import { getMetaTitle } from "~/root-meta";
import { prisma } from "~/db.server";
import { Modal, ModalHeader } from "~/components/modal";
import type { Route } from "./+types/admin.stats._index";

export const meta = getMetaTitle("Admin - Statistics");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  const userId = await getRequestUserId(request);
  const isOwner = await isUserOwner(userId);

  if (!isOwner) {
    throw redirect("/?error=AccessDenied");
  }

  // Gather statistics
  const [
    totalItems,
    activeItems,
    deletedItems,
    totalUsers,
    totalTransfers,
    sourceCounts
  ] = await Promise.all([
    prisma.itemHistory.count(),
    prisma.itemHistory.count({ where: { deletedAt: null } }),
    prisma.itemHistory.count({ where: { deletedAt: { not: null } } }),
    prisma.user.count(),
    prisma.itemTransfer.count(),
    prisma.itemHistory.groupBy({
      by: ['source'],
      _count: { source: true }
    })
  ]);

  return data({
    stats: {
      totalItems,
      activeItems,
      deletedItems,
      totalUsers,
      totalTransfers,
      sourceCounts: sourceCounts.map((s) => ({
        source: s.source,
        count: s._count.source
      }))
    }
  });
}

export default function AdminStats() {
  const { stats } = useLoaderData<typeof loader>();

  return (
    <Modal className="w-[95%] max-w-[1200px] max-h-[90vh]">
      <ModalHeader title="Admin - Statistics" linkTo="/admin" />

      <div className="mt-4 px-4 pb-4 overflow-y-auto max-h-[80vh] space-y-6">
        {/* Overview Stats */}
        <div>
          <h2 className="text-xl font-bold mb-4">Overview</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 p-6">
              <div className="text-sm text-white/60 mb-1">Total Items</div>
              <div className="text-3xl font-bold text-white">{stats.totalItems.toLocaleString()}</div>
              <div className="mt-2 text-xs">
                <span className="text-green-400">{stats.activeItems.toLocaleString()} Active</span>
                {" | "}
                <span className="text-red-400">{stats.deletedItems.toLocaleString()} Deleted</span>
              </div>
            </div>

            <div className="rounded-lg bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 p-6">
              <div className="text-sm text-white/60 mb-1">Total Users</div>
              <div className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
            </div>

            <div className="rounded-lg bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 p-6">
              <div className="text-sm text-white/60 mb-1">Total Transfers</div>
              <div className="text-3xl font-bold text-white">{stats.totalTransfers.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Items by Source */}
        <div>
          <h2 className="text-xl font-bold mb-4">Items by Source</h2>
          <div className="rounded-lg bg-black/40 p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.sourceCounts.map((source) => {
                const colors: Record<string, string> = {
                  CASE: "from-yellow-600 to-orange-600",
                  DROP: "from-blue-600 to-cyan-600",
                  SHOP: "from-green-600 to-emerald-600",
                  CRAFT: "from-purple-600 to-pink-600",
                  TRADE: "from-red-600 to-rose-600",
                  MARKETPLACE: "from-indigo-600 to-blue-600",
                  TRADEUP_REWARD: "from-amber-600 to-yellow-600"
                };

                return (
                  <div
                    key={source.source}
                    className={`rounded-lg bg-gradient-to-br ${colors[source.source] || "from-gray-600 to-gray-800"} p-4`}
                  >
                    <div className="text-sm font-medium text-white/80">{source.source}</div>
                    <div className="text-2xl font-bold text-white">{source.count.toLocaleString()}</div>
                    <div className="mt-1 text-xs text-white/60">
                      {((source.count / stats.totalItems) * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div>
          <h2 className="text-xl font-bold mb-4">Source Distribution</h2>
          <div className="rounded-lg bg-black/40 p-6">
            <div className="space-y-3">
              {stats.sourceCounts
                .sort((a, b) => b.count - a.count)
                .map((source) => {
                  const percentage = (source.count / stats.totalItems) * 100;
                  return (
                    <div key={source.source}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="font-medium">{source.source}</span>
                        <span className="text-white/60">
                          {source.count.toLocaleString()} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-6 bg-black/40 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
