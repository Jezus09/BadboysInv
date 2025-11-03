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
import { Modal, ModalHeader } from "~/components/modal";
import type { Route } from "./+types/admin.users._index";

export const meta = getMetaTitle("Admin - User Management");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  const userId = await getRequestUserId(request);
  const isOwner = await isUserOwner(userId);

  if (!isOwner) {
    throw redirect("/?error=AccessDenied");
  }

  return data({});
}

interface UserData {
  id: string;
  name: string;
  avatar: string;
  coins: string;
  createdAt: string;
  itemCount: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchQuery: searchQuery || undefined })
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.includes(searchQuery)
  );

  return (
    <Modal className="w-[95%] max-w-[1400px] max-h-[90vh]">
      <ModalHeader title="Admin - User Management" linkTo="/admin" />

      <div className="mt-4 px-4 pb-4 overflow-y-auto max-h-[80vh]">
        {/* CS2 Style Title */}
        <div className="relative mb-4 text-center">
          <h1 className="font-display bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-3xl font-black text-transparent drop-shadow-2xl">
            USER MANAGEMENT
          </h1>
          <div className="absolute inset-0 text-3xl font-black text-green-400/10 blur-sm">
            USER MANAGEMENT
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 flex gap-4 items-end rounded-sm border border-neutral-500/20 bg-neutral-800/50 p-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Search Users</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or Steam ID..."
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm"
            />
          </div>
          <div className="text-sm text-white/60">
            {filteredUsers.length} users found
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
            <p className="mt-2">Loading users...</p>
          </div>
        )}

        {/* Users Grid */}
        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-8 text-white/60">
            No users found
          </div>
        )}

        {!loading && filteredUsers.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-lg bg-gradient-to-br from-black/40 to-black/20 border border-white/10 p-4 hover:border-white/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{user.name}</div>
                    <div className="text-xs text-white/60 font-mono truncate">
                      {user.id}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/40 rounded p-2">
                    <div className="text-white/60">Coins</div>
                    <div className="font-bold text-yellow-400">{user.coins}</div>
                  </div>
                  <div className="bg-black/40 rounded p-2">
                    <div className="text-white/60">Items</div>
                    <div className="font-bold text-blue-400">{user.itemCount}</div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-white/40">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => window.open(`/api/inventory/${user.id}.json`, '_blank')}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
                  >
                    View Inventory
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(user.id)}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors"
                  >
                    Copy ID
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
