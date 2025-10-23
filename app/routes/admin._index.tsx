/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data, redirect, useLoaderData } from "react-router";
import { useNavigate } from "react-router";
import { faDatabase, faCog, faUsers, faChartLine } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { middleware } from "~/http.server";
import { isUserOwner } from "~/models/rule";
import { getRequestUserId } from "~/auth.server";
import { getMetaTitle } from "~/root-meta";
import { prisma } from "~/db.server";
import type { Route } from "./+types/admin._index";

export const meta = getMetaTitle("Admin Panel");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  // Check if user is owner
  const userId = await getRequestUserId(request);
  const isOwner = await isUserOwner(userId);

  if (!isOwner) {
    throw redirect("/?error=AccessDenied");
  }

  // Fetch quick stats
  const [totalItems, totalUsers, totalTrades, marketplaceListings] = await Promise.all([
    prisma.itemHistory.count({ where: { deletedAt: null } }),
    prisma.user.count(),
    prisma.trade.count(),
    prisma.marketplaceListing.count({ where: { status: "ACTIVE" } })
  ]);

  return data({
    stats: {
      totalItems,
      totalUsers,
      totalTrades,
      marketplaceListings
    }
  });
}

interface AdminCardProps {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
}

function AdminCard({ title, description, icon, href, color }: AdminCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(href)}
      className={`group relative overflow-hidden rounded-lg bg-gradient-to-br ${color} p-6 text-left transition-all hover:scale-105 hover:shadow-xl`}
    >
      <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
        <FontAwesomeIcon icon={icon} className="h-20 w-20" />
      </div>
      <div className="relative">
        <div className="mb-2 flex items-center gap-3">
          <FontAwesomeIcon icon={icon} className="h-6 w-6" />
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <p className="text-sm text-white/80">{description}</p>
      </div>
    </button>
  );
}

export default function AdminPanel() {
  const { stats } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-800 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-white">Admin Panel</h1>
          <p className="text-lg text-white/60">Manage your CS2 inventory system</p>
        </div>

        {/* Admin Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AdminCard
            title="Item History"
            description="View all items with UUIDs, track ownership, and transfer history"
            icon={faDatabase}
            href="/admin/item-history"
            color="from-blue-600 to-blue-800"
          />
          <AdminCard
            title="System Settings"
            description="Configure shop items, case drops, and game settings"
            icon={faCog}
            href="/admin/settings"
            color="from-purple-600 to-purple-800"
          />
          <AdminCard
            title="User Management"
            description="View and manage user accounts, inventories, and permissions"
            icon={faUsers}
            href="/admin/users"
            color="from-green-600 to-green-800"
          />
          <AdminCard
            title="Statistics"
            description="View system statistics, item sources, and economy data"
            icon={faChartLine}
            href="/admin/stats"
            color="from-orange-600 to-orange-800"
          />
        </div>

        {/* Quick Stats */}
        <div className="mt-8 rounded-lg bg-black/40 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">Quick Stats</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded bg-white/5 p-4">
              <div className="text-sm text-white/60">Total Items</div>
              <div className="text-2xl font-bold text-white">{stats.totalItems.toLocaleString()}</div>
            </div>
            <div className="rounded bg-white/5 p-4">
              <div className="text-sm text-white/60">Active Users</div>
              <div className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
            </div>
            <div className="rounded bg-white/5 p-4">
              <div className="text-sm text-white/60">Total Trades</div>
              <div className="text-2xl font-bold text-white">{stats.totalTrades.toLocaleString()}</div>
            </div>
            <div className="rounded bg-white/5 p-4">
              <div className="text-sm text-white/60">Marketplace Listings</div>
              <div className="text-2xl font-bold text-white">{stats.marketplaceListings.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-8 rounded-lg bg-black/40 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">System Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">UUID Tracking</span>
              <span className="font-medium text-green-400">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Database</span>
              <span className="font-medium text-green-400">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Redis Cache</span>
              <span className="font-medium text-green-400">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
