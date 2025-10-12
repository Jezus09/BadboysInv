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
  return data({ trades }, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
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
  const [selectedTab, setSelectedTab] = useState<"received" | "sent">("received");
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    trade: any | null;
    action: "accept" | "decline" | "cancel";
  }>({
    isOpen: false,
    trade: null,
    action: "accept",
  });

  const receivedTrades = trades.filter((trade) => trade.receiverUserId === user?.id);
  const sentTrades = trades.filter((trade) => trade.senderUserId === user?.id);

  const openModal = (trade: any, action: "accept" | "decline" | "cancel") => {
    setModalState({
      isOpen: true,
      trade,
      action,
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      trade: null,
      action: "accept",
    });
    // Refresh the trades list when modal closes
    revalidator.revalidate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "text-yellow-500";
      case "ACCEPTED": return "text-green-500";
      case "DECLINED": return "text-red-500";
      case "CANCELLED": return "text-gray-500";
      case "COMPLETED": return "text-blue-500";
      default: return "text-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING": return "Pending";
      case "ACCEPTED": return "Accepted";
      case "DECLINED": return "Declined";
      case "CANCELLED": return "Cancelled";
      case "COMPLETED": return "Completed";
      default: return status;
    }
  };

  function TradeItemDisplay({ item }: { item: any }) {
    return (
      <TradeItemCard
        item={item}
        disabled={true}
      />
    );
  }

  return (
    <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
      <div className="my-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="relative mb-6">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 drop-shadow-2xl">
              TRADES
            </h1>
            <div className="absolute inset-0 text-6xl font-black text-blue-400/20 blur-sm">
              TRADES
            </div>
          </div>
          
          <div className="text-center mb-4">
            <p className="font-display text-lg text-neutral-300 font-medium">
              Kereskedj más játékosokkal
            </p>
          </div>
          
          <div className="mb-6">
            <Link
              to="/trades/history"
              className="font-display inline-flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 bg-gray-600/20 border border-gray-500/30 rounded"
            >
              📜 Kereskedési előzmények
            </Link>
          </div>
        </div>
      
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex gap-4 flex-wrap justify-center">
            <button
              onClick={() => setSelectedTab("received")}
              className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                selectedTab === "received"
                  ? "bg-black/30"
                  : ""
              }`}
            >
              Kapott ({receivedTrades.length})
            </button>
            <button
              onClick={() => setSelectedTab("sent")}
              className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                selectedTab === "sent"
                  ? "bg-black/30"
                  : ""
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
            className="font-display inline-flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 bg-green-600/20 border border-green-500/30 rounded"
          >
            + Új kereskedés létrehozása
          </Link>
        </div>

        {/* Trades List */}
        <div className="space-y-4">
          {(selectedTab === "received" ? receivedTrades : sentTrades).map((trade) => {
            const senderItems = JSON.parse(trade.senderItems);
            const receiverItems = JSON.parse(trade.receiverItems);
            const otherUser = selectedTab === "received" ? trade.senderUser : trade.receiverUser;
            
            return (
              <div key={trade.id} className="bg-black/30 rounded-lg p-6 border border-neutral-700/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={otherUser.avatar} 
                      alt={otherUser.name}
                      className="w-10 h-10 rounded-full border border-neutral-600"
                    />
                    <div>
                      <h3 className="font-display text-white font-medium">{otherUser.name}</h3>
                      <p className="text-neutral-400 text-sm">
                        {selectedTab === "received" ? "Kereskedni szeretne veled" : "Kereskedési kérés elküldve"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-display font-medium ${getStatusColor(trade.status)}`}>
                      {getStatusText(trade.status)}
                    </span>
                    <p className="text-neutral-400 text-sm">
                      {new Date(trade.createdAt).toLocaleDateString('hu-HU')}
                    </p>
                  </div>
                </div>

                {trade.message && (
                  <div className="mb-4 p-3 bg-black/20 rounded-lg border border-neutral-700/30">
                    <p className="text-neutral-300 text-sm italic">"{trade.message}"</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-display text-white font-medium mb-2">
                      {selectedTab === "received" ? "Ő ajánlja:" : "Te ajánlod:"}
                    </h4>
                    {/* Items Grid */}
                    {senderItems.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {senderItems.map((item: any, index: number) => (
                          <TradeItemDisplay key={index} item={item} />
                        ))}
                      </div>
                    )}
                    
                    {/* Sender Coins */}
                    {(trade as any).senderCoins && Number((trade as any).senderCoins) > 0 && (
                      <div className="bg-green-900/20 border border-green-500/30 p-2 rounded flex items-center gap-2">
                        <CurrencyDisplay 
                          amount={(trade as any).senderCoins.toString()} 
                          className="text-yellow-400 font-medium"
                          showIcon={true}
                        />
                      </div>
                    )}
                    
                    {senderItems.length === 0 && (!(trade as any).senderCoins || Number((trade as any).senderCoins) === 0) && (
                      <p className="text-neutral-500 text-sm">Nincs item vagy pénz</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-display text-white font-medium mb-2">
                      {selectedTab === "received" ? "Ő kéri:" : "Te kéred:"}
                    </h4>
                    {/* Items Grid */}
                    {receiverItems.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {receiverItems.map((item: any, index: number) => (
                          <TradeItemDisplay key={index} item={item} />
                        ))}
                      </div>
                    )}
                    
                    {/* Receiver Coins */}
                    {(trade as any).receiverCoins && Number((trade as any).receiverCoins) > 0 && (
                      <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded flex items-center gap-2">
                        <CurrencyDisplay 
                          amount={(trade as any).receiverCoins.toString()} 
                          className="text-yellow-400 font-medium"
                          showIcon={true}
                        />
                      </div>
                    )}
                    
                    {receiverItems.length === 0 && (!(trade as any).receiverCoins || Number((trade as any).receiverCoins) === 0) && (
                      <p className="text-neutral-500 text-sm">Nincs item vagy pénz</p>
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
                          className="font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 bg-green-600/20 border border-green-500/30 rounded"
                        >
                          Elfogad
                        </button>
                        <button 
                          onClick={() => openModal(trade, "decline")}
                          className="font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 bg-red-600/20 border border-red-500/30 rounded"
                        >
                          Elutasít
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => openModal(trade, "cancel")}
                        className="font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 bg-gray-600/20 border border-gray-500/30 rounded"
                      >
                        Mégsem
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {(selectedTab === "received" ? receivedTrades : sentTrades).length === 0 && (
            <div className="text-center py-12">
              <p className="font-display text-neutral-400 text-lg">
                {selectedTab === "received" 
                  ? "Nincsenek kapott kereskedések" 
                  : "Nincsenek küldött kereskedések"
                }
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