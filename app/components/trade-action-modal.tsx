/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { useFetcher, useNavigate, useRevalidator } from "react-router";
import { CS2Inventory } from "@ianlucas/cs2-lib";
import { useInventory, useRules } from "./app-context";
import { getJson } from "~/utils/fetch";
import { parseInventory } from "~/utils/inventory";
import {
  ApiActionResyncData,
  ApiActionResyncUrl
} from "~/routes/api.action.resync._index";
import { TradeItemCard } from "./trade-item-card";
import { CurrencyDisplay } from "./currency-display";

interface TradeActionModalProps {
  trade: {
    id: string;
    senderItems: string;
    receiverItems: string;
    senderCoins?: number | string;
    receiverCoins?: number | string;
    message?: string | null;
    senderUser: {
      name: string;
      avatar: string;
    };
  };
  action: "accept" | "decline" | "cancel";
  isOpen: boolean;
  onClose: () => void;
}

export function TradeActionModal({
  trade,
  action,
  isOpen,
  onClose
}: TradeActionModalProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [, setInventory] = useInventory();
  const { inventoryMaxItems, inventoryStorageUnitMaxItems } = useRules();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const senderItems = JSON.parse(trade.senderItems);
  const receiverItems = JSON.parse(trade.receiverItems);

  // Function to refresh inventory manually
  const refreshInventory = async () => {
    try {
      console.log("Manually refreshing inventory after trade...");
      const { syncedAt, inventory } =
        await getJson<ApiActionResyncData>(ApiActionResyncUrl);
      setInventory(
        new CS2Inventory({
          data: parseInventory(inventory),
          maxItems: inventoryMaxItems,
          storageUnitMaxItems: inventoryStorageUnitMaxItems
        })
      );
      console.log("Inventory refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh inventory:", error);
    }
  };

  // Watch for successful trade completion
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success && isProcessing) {
      setIsProcessing(false);
      onClose();

      // For successful accept action, refresh inventory and navigate appropriately
      if (action === "accept" && fetcher.data.success) {
        // First refresh the inventory manually
        refreshInventory().then(() => {
          // Then revalidate the current page to get fresh data
          revalidator.revalidate();

          // Navigate to trades page to see updated list
          setTimeout(() => {
            navigate("/trades", { replace: true });
          }, 500);
        });
      } else {
        // For decline/cancel, just revalidate current page
        revalidator.revalidate();
      }
    } else if (
      fetcher.state === "idle" &&
      (fetcher.data?.error || !fetcher.data?.success) &&
      isProcessing
    ) {
      setIsProcessing(false);

      // Show error message to user
      if (fetcher.data?.message) {
        alert(`Trade failed: ${fetcher.data.message}`);
      } else {
        alert("Trade failed: An error occurred while processing the trade.");
      }

      // Keep modal open if there was an error so user can see the error and try again
    }
  }, [
    fetcher.state,
    fetcher.data,
    isProcessing,
    action,
    onClose,
    navigate,
    revalidator,
    inventoryMaxItems,
    inventoryStorageUnitMaxItems,
    setInventory
  ]);

  const handleAction = async () => {
    setIsProcessing(true);

    fetcher.submit(
      {
        action,
        tradeId: trade.id
      },
      {
        method: "POST",
        action: "/api/trade"
      }
    );
  };

  const getActionColor = () => {
    switch (action) {
      case "accept":
        return "border-green-500/30 bg-green-600/20";
      case "decline":
        return "border-red-500/30 bg-red-600/20";
      case "cancel":
        return "border-gray-500/30 bg-gray-600/20";
    }
  };

  const getActionText = () => {
    switch (action) {
      case "accept":
        return "Elfogadás";
      case "decline":
        return "Elutasítás";
      case "cancel":
        return "Visszavonás";
    }
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-800 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{getActionText()}</h2>
          <button
            onClick={onClose}
            className="text-xl text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Trader Info */}
        <div className="mb-6 flex items-center space-x-3 rounded-lg bg-gray-700 p-4">
          <img
            src={trade.senderUser.avatar}
            alt={trade.senderUser.name}
            className="h-12 w-12 rounded-full"
          />
          <div>
            <h3 className="font-medium text-white">{trade.senderUser.name}</h3>
            <p className="text-sm text-gray-400">Trade partner</p>
          </div>
        </div>

        {/* Trade Message */}
        {trade.message && (
          <div className="mb-6 rounded-lg bg-gray-700 p-4">
            <h4 className="mb-2 font-medium text-white">Message:</h4>
            <p className="text-gray-300 italic">"{trade.message}"</p>
          </div>
        )}

        {/* Trade Items */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-3 font-medium text-white">They offer:</h4>

            {/* Items */}
            {senderItems.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {senderItems.map((item: any, index: number) => (
                  <TradeItemCard key={index} item={item} disabled={true} />
                ))}
              </div>
            )}

            {/* Coins */}
            {trade.senderCoins && Number(trade.senderCoins) > 0 && (
              <div className="flex items-center gap-2 rounded bg-gray-700 p-3">
                <CurrencyDisplay
                  amount={trade.senderCoins.toString()}
                  className="font-medium text-yellow-400"
                  showIcon={true}
                />
              </div>
            )}

            {senderItems.length === 0 &&
              (!trade.senderCoins || Number(trade.senderCoins) === 0) && (
                <p className="text-sm text-gray-500">
                  No items or coins offered
                </p>
              )}
          </div>

          <div>
            <h4 className="mb-3 font-medium text-white">They want:</h4>

            {/* Items */}
            {receiverItems.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {receiverItems.map((item: any, index: number) => (
                  <TradeItemCard key={index} item={item} disabled={true} />
                ))}
              </div>
            )}

            {/* Coins */}
            {trade.receiverCoins && Number(trade.receiverCoins) > 0 && (
              <div className="flex items-center gap-2 rounded bg-gray-700 p-3">
                <CurrencyDisplay
                  amount={trade.receiverCoins.toString()}
                  className="font-medium text-yellow-400"
                  showIcon={true}
                />
              </div>
            )}

            {receiverItems.length === 0 &&
              (!trade.receiverCoins || Number(trade.receiverCoins) === 0) && (
                <p className="text-sm text-gray-500">
                  No specific items or coins requested
                </p>
              )}
          </div>
        </div>

        {/* Warning for accept */}
        {action === "accept" && (
          <div className="mb-6 rounded-lg border border-yellow-700 bg-yellow-900 p-4">
            <p className="text-sm text-yellow-300">
              ⚠️ This action cannot be undone. The trade will be validated to
              ensure both parties still have all the required items before
              proceeding.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleAction}
            disabled={isProcessing}
            className={`font-display inline-flex items-center gap-2 rounded border px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50 ${getActionColor()}`}
          >
            {isProcessing ? "Feldolgozás..." : getActionText()}
          </button>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="font-display inline-flex items-center gap-2 rounded border border-gray-500/30 bg-gray-600/20 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mégse
          </button>
        </div>
      </div>
    </div>
  );
}
