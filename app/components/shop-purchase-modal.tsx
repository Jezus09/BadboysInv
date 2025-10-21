/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { faCartShopping, faCoins } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CS2Economy, CS2BaseInventoryItem } from "@ianlucas/cs2-lib";
import { useFetcher, useNavigate } from "react-router";
import { useState } from "react";
import { CurrencyDisplay } from "./currency-display";
import { Modal, ModalHeader } from "./modal";
import { ModalButton } from "./modal-button";
import { useUser, useInventory } from "./app-context";
import { useSync } from "./hooks/use-sync";
import { SyncAction } from "~/data/sync";
import { playSound } from "~/utils/sound";
import { range } from "~/utils/number";
import { ItemImage } from "./item-image";

interface ShopItem {
  id: string;
  name: string;
  description?: string;
  price: string;
  category: string;
  itemId?: number;
  enabled: boolean;
  sortOrder: number;
  imageUrl?: string;
}

export function ShopPurchaseModal({
  item,
  onClose,
  disabled
}: {
  item: ShopItem;
  onClose: () => void;
  disabled?: boolean;
}) {
  const user = useUser();
  const [inventory, setInventory] = useInventory();
  const fetcher = useFetcher();
  const sync = useSync();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const userBalance = user ? parseFloat((user as any).coins || "0") : 0;
  const itemPrice = parseFloat(item.price);
  const totalPrice = itemPrice * quantity;
  const canAfford = userBalance >= totalPrice;

  // Get economy item for image display
  const getEconomyItem = () => {
    if (item.itemId) {
      try {
        return CS2Economy.getById(item.itemId);
      } catch (error) {
        console.warn(
          `Failed to get economy item for ID ${item.itemId}:`,
          error
        );
        return null;
      }
    }
    return null;
  };

  const economyItem = getEconomyItem();

  const handlePurchase = async () => {
    console.log("Purchase started", {
      item: item.name,
      quantity,
      itemId: item.itemId
    });

    if (!canAfford || disabled || !item.itemId) {
      console.log("Purchase aborted", {
        canAfford,
        disabled,
        itemId: item.itemId
      });
      setError("Nem vásárolható meg ez az item.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // First check if we can get the economy item
      const economyItem = CS2Economy.getById(item.itemId);

      if (!economyItem) {
        console.error("Economy item not found for ID:", item.itemId);
        setError("Az item nem található a rendszerben.");
        return;
      }

      console.log("Economy item found:", economyItem.name);

      // First deduct coins via API (before adding items)
      const response = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "purchase",
          shopItemId: item.id,
          quantity: quantity.toString()
        })
      });

      const result = await response.json();
      console.log("Purchase result:", result);

      if (!result.success) {
        console.error("Purchase failed:", result.message);
        setError(result.message || "A vásárlás sikertelen volt.");
        return;
      }

      // Only if payment was successful, add items to inventory
      console.log("Payment successful, adding items to inventory");

      // Play success sound
      playSound("inventory_new_item_accept");

      // Create inventory item
      const inventoryItem = {
        id: economyItem.id
      } satisfies CS2BaseInventoryItem;

      console.log("Adding inventory items:", inventoryItem);

      // Add each item to inventory
      for (let i = 0; i < quantity; i++) {
        // Add to local inventory
        setInventory(inventory.add(inventoryItem));

        // Sync to server using AddFromShop (no owner check)
        sync({
          type: SyncAction.AddFromShop,
          item: inventoryItem
        });
      }

      console.log("Purchase completed successfully");

      // Wait a moment then close
      setTimeout(() => {
        onClose();
        navigate("/");
      }, 1000);
    } catch (error) {
      console.error("Purchase failed:", error);
      setError("Hiba történt a vásárlás során. Próbáld újra.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isPurchasing = fetcher.state === "submitting";

  return (
    <Modal className="w-[400px]" fixed>
      <ModalHeader title="Vásárlás" onClose={onClose} />

      <div className="space-y-4 p-4">
        {/* Item info with image */}
        <div className="text-center">
          {/* Item Image */}
          {economyItem && (
            <div className="mb-4">
              <ItemImage
                item={economyItem}
                className="mx-auto h-24 w-32 object-contain"
                lazy
              />
            </div>
          )}

          <h3 className="mb-2 text-lg font-bold text-white">{item.name}</h3>
          {item.description && (
            <p className="mb-4 text-sm text-neutral-400">{item.description}</p>
          )}
        </div>

        {/* Quantity selector */}
        <div className="flex items-center justify-center gap-4">
          <label className="text-neutral-300">Mennyiség:</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-8 w-8 items-center justify-center rounded bg-neutral-600 text-white hover:bg-neutral-500"
              disabled={quantity <= 1}
            >
              -
            </button>
            <span className="w-8 text-center font-bold text-white">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded bg-neutral-600 text-white hover:bg-neutral-500"
              disabled={quantity >= 10} // Max 10
            >
              +
            </button>
          </div>
        </div>

        {/* Price info */}
        <div className="space-y-2 rounded bg-neutral-800 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Egységár:</span>
            <CurrencyDisplay amount={item.price} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Mennyiség:</span>
            <span className="text-white">{quantity}x</span>
          </div>
          <div className="border-t border-neutral-700 pt-2">
            <div className="flex justify-between font-bold">
              <span className="text-white">Összesen:</span>
              <CurrencyDisplay amount={totalPrice.toFixed(2)} />
            </div>
          </div>
        </div>

        {/* Balance info */}
        <div className="rounded bg-neutral-700 p-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-300">Jelenlegi egyenleg:</span>
            <CurrencyDisplay amount={userBalance.toFixed(2)} />
          </div>
          {!canAfford && (
            <div className="mt-2 text-sm text-red-400">
              Nincs elegendő pénzed ehhez a vásárláshoz!
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded bg-red-800 p-3 text-red-200">{error}</div>
        )}

        {/* Success message */}
        {isProcessing && (
          <div className="rounded bg-blue-800 p-3 text-blue-200">
            Vásárlás folyamatban...
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <ModalButton onClick={onClose} variant="secondary">
            Mégse
          </ModalButton>
          <ModalButton
            onClick={handlePurchase}
            disabled={!canAfford || disabled || isProcessing || !item.itemId}
            variant="primary"
          >
            {isProcessing ? (
              "Vásárlás..."
            ) : (
              <>
                <FontAwesomeIcon icon={faCartShopping} className="mr-2" />
                Vásárlás
              </>
            )}
          </ModalButton>
        </div>

        {/* Purchase result */}
        {fetcher.data && (
          <div
            className={`rounded p-3 ${
              fetcher.data.success
                ? "bg-green-800 text-green-200"
                : "bg-red-800 text-red-200"
            }`}
          >
            {fetcher.data.message}
          </div>
        )}
      </div>
    </Modal>
  );
}
