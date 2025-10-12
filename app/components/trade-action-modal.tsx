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
import { ApiActionResyncData, ApiActionResyncUrl } from "~/routes/api.action.resync._index";
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

export function TradeActionModal({ trade, action, isOpen, onClose }: TradeActionModalProps) {
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
      const { syncedAt, inventory } = await getJson<ApiActionResyncData>(ApiActionResyncUrl);
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
    } else if (fetcher.state === "idle" && (fetcher.data?.error || !fetcher.data?.success) && isProcessing) {
      setIsProcessing(false);
      
      // Show error message to user
      if (fetcher.data?.message) {
        alert(`Trade failed: ${fetcher.data.message}`);
      } else {
        alert("Trade failed: An error occurred while processing the trade.");
      }
      
      // Keep modal open if there was an error so user can see the error and try again
    }
  }, [fetcher.state, fetcher.data, isProcessing, action, onClose, navigate, revalidator, inventoryMaxItems, inventoryStorageUnitMaxItems, setInventory]);

  const handleAction = async () => {
    setIsProcessing(true);
    
    fetcher.submit(
      {
        action,
        tradeId: trade.id,
      },
      {
        method: "POST",
        action: "/api/trade",
      }
    );
  };

  const getActionColor = () => {
    switch (action) {
      case "accept": return "bg-green-600 hover:bg-green-700";
      case "decline": return "bg-red-600 hover:bg-red-700";
      case "cancel": return "bg-gray-600 hover:bg-gray-700";
    }
  };

  const getActionText = () => {
    switch (action) {
      case "accept": return "Accept Trade";
      case "decline": return "Decline Trade";
      case "cancel": return "Cancel Trade";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{getActionText()}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Trader Info */}
        <div className="flex items-center space-x-3 mb-6 p-4 bg-gray-700 rounded-lg">
          <img 
            src={trade.senderUser.avatar} 
            alt={trade.senderUser.name}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h3 className="text-white font-medium">{trade.senderUser.name}</h3>
            <p className="text-gray-400 text-sm">Trade partner</p>
          </div>
        </div>

        {/* Trade Message */}
        {trade.message && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="text-white font-medium mb-2">Message:</h4>
            <p className="text-gray-300 italic">"{trade.message}"</p>
          </div>
        )}

        {/* Trade Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-white font-medium mb-3">They offer:</h4>
            
            {/* Items */}
            {senderItems.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                {senderItems.map((item: any, index: number) => (
                  <TradeItemCard
                    key={index}
                    item={item}
                    disabled={true}
                  />
                ))}
              </div>
            )}
            
            {/* Coins */}
            {trade.senderCoins && Number(trade.senderCoins) > 0 && (
              <div className="bg-gray-700 p-3 rounded flex items-center gap-2">
                <CurrencyDisplay 
                  amount={trade.senderCoins.toString()} 
                  className="text-yellow-400 font-medium"
                  showIcon={true}
                />
              </div>
            )}
            
            {senderItems.length === 0 && (!trade.senderCoins || Number(trade.senderCoins) === 0) && (
              <p className="text-gray-500 text-sm">No items or coins offered</p>
            )}
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-3">They want:</h4>
            
            {/* Items */}
            {receiverItems.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                {receiverItems.map((item: any, index: number) => (
                  <TradeItemCard
                    key={index}
                    item={item}
                    disabled={true}
                  />
                ))}
              </div>
            )}
            
            {/* Coins */}
            {trade.receiverCoins && Number(trade.receiverCoins) > 0 && (
              <div className="bg-gray-700 p-3 rounded flex items-center gap-2">
                <CurrencyDisplay 
                  amount={trade.receiverCoins.toString()} 
                  className="text-yellow-400 font-medium"
                  showIcon={true}
                />
              </div>
            )}
            
            {receiverItems.length === 0 && (!trade.receiverCoins || Number(trade.receiverCoins) === 0) && (
              <p className="text-gray-500 text-sm">No specific items or coins requested</p>
            )}
          </div>
        </div>

        {/* Warning for accept */}
        {action === "accept" && (
          <div className="mb-6 p-4 bg-yellow-900 border border-yellow-700 rounded-lg">
            <p className="text-yellow-300 text-sm">
              ⚠️ This action cannot be undone. The trade will be validated to ensure both parties still have all the required items before proceeding.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleAction}
            disabled={isProcessing}
            className={`flex-1 py-3 px-6 rounded-lg font-medium text-white transition-colors ${getActionColor()} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isProcessing ? "Processing..." : getActionText()}
          </button>
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 px-6 rounded-lg font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}