/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { data, useLoaderData, Link, useRevalidator } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/auth.server";
import { getUserTrades } from "~/models/trade.server";
import { useUser, useTranslate } from "~/components/app-context";
import { TradeActionModal } from "~/components/trade-action-modal";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { ItemImage } from "~/components/item-image";
import { CurrencyDisplay } from "~/components/currency-display";
import { TradeItemCard } from "~/components/trade-item-card";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const trades = await getUserTrades(user.id);
  return data(
    { trades },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    }
  );
}

interface Trade {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  senderItems: string;
  receiverItems: string;
  status: string;
  message?: string | null;
  createdAt: string;
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
}

export default function TradesPage() {
  const { trades } = useLoaderData<typeof loader>();
  const user = useUser();
  const revalidator = useRevalidator();
  const [selectedTab, setSelectedTab] = useState<"received" | "sent">(
    "received"
  );
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    trade: any | null;
    action: "accept" | "decline" | "cancel";
  }>({
    isOpen: false,
    trade: null,
    action: "accept"
  });

  const receivedTrades = trades.filter(
    (trade) => trade.receiverUserId === user?.id
  );
  const sentTrades = trades.filter((trade) => trade.senderUserId === user?.id);

  const openModal = (trade: any, action: "accept" | "decline" | "cancel") => {
    setModalState({
      isOpen: true,
      trade,
      action
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      trade: null,
      action: "accept"
    });
    // Refresh the trades list when modal closes
    revalidator.revalidate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-500";
      case "ACCEPTED":
        return "text-green-500";
      case "DECLINED":
        return "text-red-500";
      case "CANCELLED":
        return "text-gray-500";
      case "COMPLETED":
        return "text-blue-500";
      default:
        return "text-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "ACCEPTED":
        return "Accepted";
      case "DECLINED":
        return "Declined";
      case "CANCELLED":
        return "Cancelled";
      case "COMPLETED":
        return "Completed";
      default:
        return status;
    }
  };

  function TradeItemDisplay({ item }: { item: any }) {
    return <TradeItemCard item={item} disabled={true} />;
  }

  return (
    <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
      <div className="my-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="relative mb-6">
            <h1 className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-6xl font-black text-transparent drop-shadow-2xl">
              TRADES
            </h1>
            <div className="absolute inset-0 text-6xl font-black text-blue-400/20 blur-sm">
              TRADES
            </div>
          </div>

          <div className="mb-4 text-center">
            <p className="font-display text-lg font-medium text-neutral-300">
              Kereskedj más játékosokkal
            </p>
          </div>

          <div className="mb-6">
            <Link
              to="/trades/history"
              className="font-display inline-flex items-center gap-2 rounded border border-gray-500/30 bg-gray-600/20 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70"
            >
              📜 Kereskedési előzmények
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setSelectedTab("received")}
              className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                selectedTab === "received" ? "bg-black/30" : ""
              }`}
            >
              Kapott ({receivedTrades.length})
            </button>
            <button
              onClick={() => setSelectedTab("sent")}
              className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                selectedTab === "sent" ? "bg-black/30" : ""
              }`}
            >
              Küldött ({sentTrades.length})
            </button>
          </div>
        </div>

        {/* Create Trade Button */}
        <div className="mb-6 text-center">
          <Link
            to="/trades/create"
            className="font-display inline-flex items-center gap-2 rounded border border-green-500/30 bg-green-600/20 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70"
          >
            + Új kereskedés létrehozása
          </Link>
        </div>

        {/* Trades List */}
        <div className="space-y-4">
          {(selectedTab === "received" ? receivedTrades : sentTrades).map(
            (trade) => {
              const senderItems = JSON.parse(trade.senderItems);
              const receiverItems = JSON.parse(trade.receiverItems);
              const otherUser =
                selectedTab === "received"
                  ? trade.senderUser
                  : trade.receiverUser;

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
                          {selectedTab === "received"
                            ? "Kereskedni szeretne veled"
                            : "Kereskedési kérés elküldve"}
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
                    </div>
                  </div>

                  {trade.message && (
                    <div className="mb-4 rounded-lg border border-neutral-700/30 bg-black/20 p-3">
                      <p className="text-sm text-neutral-300 italic">
                        "{trade.message}"
                      </p>
                    </div>
                  )}

                  <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-display mb-2 font-medium text-white">
                        {selectedTab === "received"
                          ? "Ő ajánlja:"
                          : "Te ajánlod:"}
                      </h4>
                      {/* Items Grid */}
                      {senderItems.length > 0 && (
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {senderItems.map((item: any, index: number) => (
                            <TradeItemDisplay key={index} item={item} />
                          ))}
                        </div>
                      )}

                      {/* Sender Coins */}
                      {(trade as any).senderCoins &&
                        Number((trade as any).senderCoins) > 0 && (
                          <div className="flex items-center gap-2 rounded border border-green-500/30 bg-green-900/20 p-2">
                            <CurrencyDisplay
                              amount={(trade as any).senderCoins.toString()}
                              className="font-medium text-yellow-400"
                              showIcon={true}
                            />
                          </div>
                        )}

                      {senderItems.length === 0 &&
                        (!(trade as any).senderCoins ||
                          Number((trade as any).senderCoins) === 0) && (
                          <p className="text-sm text-neutral-500">
                            Nincs item vagy pénz
                          </p>
                        )}
                    </div>

                    <div>
                      <h4 className="font-display mb-2 font-medium text-white">
                        {selectedTab === "received" ? "Ő kéri:" : "Te kéred:"}
                      </h4>
                      {/* Items Grid */}
                      {receiverItems.length > 0 && (
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {receiverItems.map((item: any, index: number) => (
                            <TradeItemDisplay key={index} item={item} />
                          ))}
                        </div>
                      )}

                      {/* Receiver Coins */}
                      {(trade as any).receiverCoins &&
                        Number((trade as any).receiverCoins) > 0 && (
                          <div className="flex items-center gap-2 rounded border border-blue-500/30 bg-blue-900/20 p-2">
                            <CurrencyDisplay
                              amount={(trade as any).receiverCoins.toString()}
                              className="font-medium text-yellow-400"
                              showIcon={true}
                            />
                          </div>
                        )}

                      {receiverItems.length === 0 &&
                        (!(trade as any).receiverCoins ||
                          Number((trade as any).receiverCoins) === 0) && (
                          <p className="text-sm text-neutral-500">
                            Nincs item vagy pénz
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {trade.status === "PENDING" && (
                    <div className="flex space-x-2">
                      {selectedTab === "received" ? (
                        <>
                          <button
                            onClick={() => openModal(trade, "accept")}
                            className="font-display flex items-center gap-2 rounded border border-green-500/30 bg-green-600/20 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70"
                          >
                            Elfogad
                          </button>
                          <button
                            onClick={() => openModal(trade, "decline")}
                            className="font-display flex items-center gap-2 rounded border border-red-500/30 bg-red-600/20 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70"
                          >
                            Elutasít
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openModal(trade, "cancel")}
                          className="font-display flex items-center gap-2 rounded border border-gray-500/30 bg-gray-600/20 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70"
                        >
                          Mégsem
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}

          {(selectedTab === "received" ? receivedTrades : sentTrades).length ===
            0 && (
            <div className="py-12 text-center">
              <p className="font-display text-lg text-neutral-400">
                {selectedTab === "received"
                  ? "Nincsenek kapott kereskedések"
                  : "Nincsenek küldött kereskedések"}
              </p>
            </div>
          )}
        </div>

        {/* Trade Action Modal */}
        {modalState.trade && (
          <TradeActionModal
            trade={modalState.trade}
            action={modalState.action}
            isOpen={modalState.isOpen}
            onClose={closeModal}
          />
        )}
      </div>
    </div>
  );
}
