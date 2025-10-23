/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { data, redirect } from "react-router";
import { middleware } from "~/http.server";
import { isUserOwner } from "~/models/rule";
import { getRequestUserId } from "~/auth.server";
import { getMetaTitle } from "~/root-meta";
import { Modal, ModalHeader } from "~/components/modal";
import type { Route } from "./+types/admin.settings._index";

export const meta = getMetaTitle("Admin - Settings");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  const userId = await getRequestUserId(request);
  const isOwner = await isUserOwner(userId);

  if (!isOwner) {
    throw redirect("/?error=AccessDenied");
  }

  return data({});
}

export default function AdminSettings() {
  return (
    <Modal className="w-[95%] max-w-[1000px] max-h-[90vh]">
      <ModalHeader title="Admin - System Settings" linkTo="/admin" />

      <div className="mt-4 px-4 pb-4 overflow-y-auto max-h-[80vh] space-y-6">
        {/* UUID System */}
        <div className="rounded-lg bg-black/40 p-6">
          <h2 className="text-xl font-bold mb-4">UUID Tracking System</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <div className="font-medium">UUID Tracking</div>
                <div className="text-sm text-white/60">Track all items with unique identifiers</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <div className="font-medium">Item History</div>
                <div className="text-sm text-white/60">Record item creation and transfers</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">Transfer Tracking</div>
                <div className="text-sm text-white/60">Monitor all item transfers between users</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database */}
        <div className="rounded-lg bg-black/40 p-6">
          <h2 className="text-xl font-bold mb-4">Database</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <div className="font-medium">Connection Status</div>
                <div className="text-sm text-white/60">PostgreSQL database connection</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 font-medium">Connected</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <div className="font-medium">Redis Cache</div>
                <div className="text-sm text-white/60">In-memory caching for performance</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">Prisma ORM</div>
                <div className="text-sm text-white/60">Database access layer</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 font-medium">v6.17.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Integration */}
        <div className="rounded-lg bg-black/40 p-6">
          <h2 className="text-xl font-bold mb-4">Game Integration</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <div className="font-medium">CS2 Server Plugin</div>
                <div className="text-sm text-white/60">In-game item drops and integration</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">Enabled</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <div className="font-medium">Drop System</div>
                <div className="text-sm text-white/60">Random weapon drops from kills</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">Case Opening</div>
                <div className="text-sm text-white/60">Web-based case opening system</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Economy */}
        <div className="rounded-lg bg-black/40 p-6">
          <h2 className="text-xl font-bold mb-4">Economy Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <div className="font-medium">Shop System</div>
                <div className="text-sm text-white/60">Buy items with coins</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <div className="font-medium">Marketplace</div>
                <div className="text-sm text-white/60">Player-to-player trading</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">Trade Up Contract</div>
                <div className="text-sm text-white/60">Trade lower tier items for higher tier</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-medium">Owner Only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Box */}
        <div className="rounded-lg bg-yellow-600/20 border border-yellow-500/50 p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-400 text-2xl">⚠️</div>
            <div>
              <div className="font-bold text-yellow-400">Admin Access</div>
              <div className="text-sm text-white/80">
                These settings are read-only. To modify system configuration, edit the environment
                variables and Prisma schema files.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
