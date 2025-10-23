/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, redirect } from "react-router";
import { useTranslate } from "~/components/app-context";
import { Modal, ModalHeader } from "~/components/modal";
import { middleware } from "~/http.server";
import { isUserOwner } from "~/models/rule";
import { getRequestUserId } from "~/auth.server";
import { getMetaTitle } from "~/root-meta";
import { CS2Economy } from "@ianlucas/cs2-lib";
import type { Route } from "./+types/admin.item-history._index";

export const meta = getMetaTitle("Admin - Item History");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);

  // Check if user is owner
  const userId = await getRequestUserId(request);
  const isOwner = await isUserOwner(userId);

  if (!isOwner) {
    throw redirect("/?error=AccessDenied");
  }

  return data({});
}

interface ItemHistoryData {
  itemUuid: string;
  itemId: number;
  wear?: number;
  seed?: number;
  nameTag?: string;
  stickers?: any;
  createdAt: string;
  createdBy: string;
  source: string;
  currentOwner: string | null;
  deletedAt?: string;
  transferCount: number;
  recentTransfers: Array<{
    fromUser: string | null;
    toUser: string;
    transferType: string;
    timestamp: string;
    metadata?: any;
  }>;
}

export default function AdminItemHistory() {
  const translate = useTranslate();
  const [items, setItems] = useState<ItemHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filterUser, setFilterUser] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [offset, setOffset] = useState(0);
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);

  const limit = 50;

  async function fetchItems() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/item-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filterUser: filterUser || undefined,
          filterSource: filterSource || undefined,
          limit,
          offset
        })
      });

      const data = await response.json();
      if (data.success) {
        setItems(data.items);
        setTotalCount(data.totalCount);
      }
    } catch (error) {
      console.error("Failed to fetch item history:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, [offset, filterUser, filterSource]);

  function handleFilterReset() {
    setFilterUser("");
    setFilterSource("");
    setOffset(0);
  }

  function toggleExpanded(uuid: string) {
    setExpandedUuid(expandedUuid === uuid ? null : uuid);
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <Modal className="w-[95%] max-w-[1400px] max-h-[90vh]">
      <ModalHeader title="Admin - Item History" linkTo="/" />

      <div className="mt-4 px-4 pb-4 overflow-y-auto max-h-[80vh]">
        {/* Filters */}
        <div className="mb-4 flex gap-4 items-end bg-black/20 p-4 rounded">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Filter User ID</label>
            <input
              type="text"
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                setOffset(0);
              }}
              placeholder="Steam ID..."
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Filter Source</label>
            <select
              value={filterSource}
              onChange={(e) => {
                setFilterSource(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded text-sm"
            >
              <option value="">All Sources</option>
              <option value="CASE">CASE</option>
              <option value="DROP">DROP</option>
              <option value="SHOP">SHOP</option>
              <option value="CRAFT">CRAFT</option>
              <option value="TRADE">TRADE</option>
              <option value="MARKETPLACE">MARKETPLACE</option>
              <option value="TRADEUP_REWARD">TRADEUP_REWARD</option>
            </select>
          </div>
          <button
            onClick={handleFilterReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium"
          >
            Reset Filters
          </button>
        </div>

        {/* Stats */}
        <div className="mb-4 text-sm">
          <strong>Total Items:</strong> {totalCount} |
          <strong className="ml-2">Page:</strong> {currentPage} / {totalPages}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
            <p className="mt-2">Loading...</p>
          </div>
        )}

        {/* Items Table */}
        {!loading && items.length === 0 && (
          <div className="text-center py-8 text-white/60">
            No items found
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-white/10">
                  <th className="px-3 py-2 text-left">UUID</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Owner</th>
                  <th className="px-3 py-2 text-center">Transfers</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const itemInfo = CS2Economy.getById(item.itemId);
                  const isExpanded = expandedUuid === item.itemUuid;

                  return (
                    <>
                      <tr
                        key={item.itemUuid}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                        onClick={() => toggleExpanded(item.itemUuid)}
                      >
                        <td className="px-3 py-2 font-mono text-xs text-blue-400">
                          {item.itemUuid.substring(0, 8)}...
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{itemInfo.name}</div>
                          {item.wear && (
                            <div className="text-xs text-white/60">
                              Wear: {item.wear.toFixed(4)}
                            </div>
                          )}
                          {item.nameTag && (
                            <div className="text-xs text-yellow-400">
                              "{item.nameTag}"
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-1 bg-blue-600/30 rounded text-xs">
                            {item.source}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {item.currentOwner ? (
                            item.currentOwner.substring(0, 12) + "..."
                          ) : (
                            <span className="text-red-400">Deleted</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-1 bg-purple-600/30 rounded">
                            {item.transferCount}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.deletedAt ? (
                            <span className="px-2 py-1 bg-red-600/30 rounded text-xs">
                              Deleted
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-600/30 rounded text-xs">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-black/30">
                          <td colSpan={7} className="px-3 py-4">
                            <div className="space-y-3">
                              {/* Full UUID */}
                              <div>
                                <strong className="text-xs text-white/60">Full UUID:</strong>
                                <div className="font-mono text-xs bg-black/40 p-2 rounded mt-1">
                                  {item.itemUuid}
                                </div>
                              </div>

                              {/* Item Details */}
                              <div>
                                <strong className="text-xs text-white/60">Details:</strong>
                                <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                                  <div>Item ID: {item.itemId}</div>
                                  {item.seed && <div>Seed: {item.seed}</div>}
                                  <div>Created By: {item.createdBy}</div>
                                  {item.deletedAt && (
                                    <div className="text-red-400">
                                      Deleted: {new Date(item.deletedAt).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Recent Transfers */}
                              {item.recentTransfers.length > 0 && (
                                <div>
                                  <strong className="text-xs text-white/60">
                                    Recent Transfers (last 5):
                                  </strong>
                                  <div className="mt-1 space-y-1">
                                    {item.recentTransfers.map((transfer, idx) => (
                                      <div
                                        key={idx}
                                        className="text-xs bg-black/40 p-2 rounded flex justify-between"
                                      >
                                        <span>
                                          <span className="text-orange-400">
                                            {transfer.transferType}
                                          </span>
                                          {" → "}
                                          <span className="font-mono">
                                            {transfer.toUser.substring(0, 12)}...
                                          </span>
                                        </span>
                                        <span className="text-white/60">
                                          {new Date(transfer.timestamp).toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 bg-black/40 hover:bg-black/60 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= totalCount}
              className="px-4 py-2 bg-black/40 hover:bg-black/60 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
