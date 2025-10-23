/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { data, useLoaderData, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/auth.server";
import { getTradeHistory } from "~/models/trade.server";
import { useUser, useTranslate } from "~/components/app-context";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { ItemImage } from "~/components/item-image";
import { TradeItemCard } from "~/components/trade-item-card";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 10;

  const { trades, totalCount } = await getTradeHistory(user.id, page, limit);
  const totalPages = Math.ceil(totalCount / limit);

  return data({
    trades,
    currentPage: page,
    totalPages,
    totalCount
  });
}

interface Trade {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  message: string | null;
  senderUser: {
    id: string;
    name: string;
    avatar: string;
  };
  receiverUser: {
    id: string;
    name: string;
    avatar: string;
  };
  senderItems: string;
  receiverItems: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "text-yellow-400";
    case "ACCEPTED":
      return "text-green-400";
    case "COMPLETED":
      return "text-green-400";
    case "DECLINED":
      return "text-red-400";
    case "CANCELLED":
      return "text-gray-400";
    case "EXPIRED":
      return "text-orange-400";
    default:
      return "text-gray-400";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "PENDING":
      return "Függőben";
    case "ACCEPTED":
      return "Elfogadva";
    case "COMPLETED":
      return "Befejezve";
    case "DECLINED":
      return "Elutasítva";
    case "CANCELLED":
      return "Megszakítva";
    case "EXPIRED":
      return "Lejárt";
    default:
      return status;
  }
};

function TradeItemDisplay({ item }: { item: any }) {
  return <TradeItemCard item={item} disabled={true} />;
}

export default function TradeHistoryPage() {
  const { trades, currentPage, totalPages, totalCount } =
    useLoaderData<typeof loader>();
  const user = useUser();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  if (!user) return null;

  const filteredTrades = trades.filter(
    (trade: Trade) => filterStatus === "all" || trade.status === filterStatus
  );

  return (
    <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
      <div className="my-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="relative mb-6">
            <h1 className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-6xl font-black text-transparent drop-shadow-2xl">
              KERESKEDÉSI ELŐZMÉNYEK
            </h1>
            <div className="absolute inset-0 text-6xl font-black text-blue-400/20 blur-sm">
              KERESKEDÉSI ELŐZMÉNYEK
            </div>
          </div>

          <div className="mb-4 text-center">
            <p className="font-display text-lg font-medium text-neutral-300">
              Összes kereskedés: {totalCount}
            </p>
          </div>

          <div className="mb-6">
            <Link
              to="/trades"
              className="font-display inline-flex items-center gap-2 rounded border border-gray-500/30 bg-gray-600/20 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70"
            >
              ← Vissza a kereskedésekhez
            </Link>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setFilterStatus("all")}
              className={`font-display rounded px-3 py-1 transition-all hover:bg-black/30 active:bg-black/70 ${
                filterStatus === "all" ? "bg-black/30" : "bg-black/10"
              }`}
            >
              Összes
            </button>
            <button
              onClick={() => setFilterStatus("COMPLETED")}
              className={`font-display rounded px-3 py-1 transition-all hover:bg-black/30 active:bg-black/70 ${
                filterStatus === "COMPLETED" ? "bg-black/30" : "bg-black/10"
              }`}
            >
              Befejezett
            </button>
            <button
              onClick={() => setFilterStatus("PENDING")}
              className={`font-display rounded px-3 py-1 transition-all hover:bg-black/30 active:bg-black/70 ${
                filterStatus === "PENDING" ? "bg-black/30" : "bg-black/10"
              }`}
            >
              Függőben
            </button>
            <button
              onClick={() => setFilterStatus("DECLINED")}
              className={`font-display rounded px-3 py-1 transition-all hover:bg-black/30 active:bg-black/70 ${
                filterStatus === "DECLINED" ? "bg-black/30" : "bg-black/10"
              }`}
            >
              Elutasított
            </button>
          </div>
        </div>

        {/* Trade History List */}
        <div className="space-y-4">
          {filteredTrades.map((trade: Trade) => {
            const senderItems = JSON.parse(trade.senderItems);
            const receiverItems = JSON.parse(trade.receiverItems);
            const isUserSender = trade.senderUser.id === user.id;
            const otherUser = isUserSender
              ? trade.receiverUser
              : trade.senderUser;

            return (
              <div
                key={trade.id}
                className="rounded-lg border border-neutral-700/50 bg-black/30 p-6 backdrop-blur-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={otherUser.avatar}
                      alt={otherUser.name}
                      className="h-10 w-10 rounded-full border border-neutral-600"
                    />
                    <div>
                      <h3 className="font-display font-medium text-white">
                        {otherUser.name}
                      </h3>
                      <p className="text-sm text-neutral-400">
                        {isUserSender
                          ? "Küldött kereskedés"
                          : "Kapott kereskedés"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-display font-medium ${getStatusColor(trade.status)}`}
                    >
                      {getStatusText(trade.status)}
                    </span>
                    <p className="text-sm text-neutral-400">
                      {new Date(trade.createdAt).toLocaleDateString("hu-HU")}
                    </p>
                    {trade.completedAt && (
                      <p className="text-xs text-neutral-500">
                        Befejezve:{" "}
                        {new Date(trade.completedAt).toLocaleDateString(
                          "hu-HU"
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {trade.message && (
                  <div className="mb-4 rounded-lg border border-neutral-700/30 bg-black/20 p-3">
                    <p className="text-sm text-neutral-300 italic">
                      "{trade.message}"
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-display mb-2 font-medium text-white">
                      {isUserSender ? "Te ajánlottad:" : "Ő ajánlotta:"}
                    </h4>
                    <div className="space-y-2">
                      {senderItems.length > 0 ? (
                        senderItems.map((item: any, index: number) => (
                          <TradeItemDisplay key={index} item={item} />
                        ))
                      ) : (
                        <p className="text-sm text-neutral-500">Nincs item</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display mb-2 font-medium text-white">
                      {isUserSender ? "Te kérted:" : "Ő kérte:"}
                    </h4>
                    <div className="space-y-2">
                      {receiverItems.length > 0 ? (
                        receiverItems.map((item: any, index: number) => (
                          <TradeItemDisplay key={index} item={item} />
                        ))
                      ) : (
                        <p className="text-sm text-neutral-500">Nincs item</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTrades.length === 0 && (
            <div className="py-8 text-center">
              <p className="font-display text-lg text-neutral-400">
                Nincsenek kereskedési előzmények
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {currentPage > 1 && (
              <Link
                to={`/trades/history?page=${currentPage - 1}`}
                className="font-display rounded bg-black/10 px-3 py-1 transition-all hover:bg-black/30 active:bg-black/70"
              >
                ← Előző
              </Link>
            )}

            <span className="font-display px-3 py-1 text-neutral-300">
              {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages && (
              <Link
                to={`/trades/history?page=${currentPage + 1}`}
                className="font-display rounded bg-black/10 px-3 py-1 transition-all hover:bg-black/30 active:bg-black/70"
              >
                Következő →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
