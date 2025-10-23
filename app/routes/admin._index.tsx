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
import { Modal, ModalHeader } from "~/components/modal";
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
      className={`font-display group relative overflow-hidden rounded-sm border border-neutral-500/20 bg-gradient-to-br ${color} p-4 text-left transition-all hover:scale-[1.02] hover:border-neutral-400/40 hover:shadow-lg`}
    >
      <div className="absolute right-2 top-2 opacity-5 transition-opacity group-hover:opacity-10">
        <FontAwesomeIcon icon={icon} className="h-16 w-16" />
      </div>
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <FontAwesomeIcon icon={icon} className="h-5 w-5" />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-xs text-white/70">{description}</p>
      </div>
    </button>
  );
}

export default function AdminPanel() {
  const { stats } = useLoaderData<typeof loader>();

  return (
    <Modal className="w-[95%] max-w-[900px] max-h-[90vh]">
      <ModalHeader title="Admin Panel" linkTo="/" />

      <div className="mt-4 px-4 pb-4 overflow-y-auto max-h-[80vh]">
        {/* CS2 Style Title */}
        <div className="relative mb-6 text-center">
          <h1 className="font-display bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-4xl font-black text-transparent drop-shadow-2xl">
            ADMIN PANEL
          </h1>
          <div className="absolute inset-0 text-4xl font-black text-blue-400/10 blur-sm">
            ADMIN PANEL
          </div>
        </div>

        {/* Admin Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <AdminCard
            title="Item History"
            description="View all items with UUIDs and track ownership"
            icon={faDatabase}
            href="/admin/item-history"
            color="from-blue-600/20 to-blue-800/20"
          />
          <AdminCard
            title="System Settings"
            description="View system configuration and status"
            icon={faCog}
            href="/admin/settings"
            color="from-purple-600/20 to-purple-800/20"
          />
          <AdminCard
            title="User Management"
            description="View and manage user accounts"
            icon={faUsers}
            href="/admin/users"
            color="from-green-600/20 to-green-800/20"
          />
          <AdminCard
            title="Statistics"
            description="View system statistics and analytics"
            icon={faChartLine}
            href="/admin/stats"
            color="from-orange-600/20 to-orange-800/20"
          />
        </div>

        {/* Quick Stats */}
        <div className="rounded-sm border border-neutral-500/20 bg-neutral-800/50 p-4 mb-4">
          <h2 className="mb-3 text-lg font-bold text-white">Quick Stats</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="rounded-sm bg-black/40 p-3 border border-neutral-500/10">
              <div className="text-xs text-white/60">Total Items</div>
              <div className="text-xl font-bold text-white">{stats.totalItems.toLocaleString()}</div>
            </div>
            <div className="rounded-sm bg-black/40 p-3 border border-neutral-500/10">
              <div className="text-xs text-white/60">Active Users</div>
              <div className="text-xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
            </div>
            <div className="rounded-sm bg-black/40 p-3 border border-neutral-500/10">
              <div className="text-xs text-white/60">Total Trades</div>
              <div className="text-xl font-bold text-white">{stats.totalTrades.toLocaleString()}</div>
            </div>
            <div className="rounded-sm bg-black/40 p-3 border border-neutral-500/10">
              <div className="text-xs text-white/60">Marketplace</div>
              <div className="text-xl font-bold text-white">{stats.marketplaceListings.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="rounded-sm border border-neutral-500/20 bg-neutral-800/50 p-4">
          <h2 className="mb-3 text-lg font-bold text-white">System Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-white/60">UUID Tracking</span>
              <span className="font-medium text-green-400">● Active</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-white/60">Database</span>
              <span className="font-medium text-green-400">● Connected</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-white/60">Redis Cache</span>
              <span className="font-medium text-green-400">● Active</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
