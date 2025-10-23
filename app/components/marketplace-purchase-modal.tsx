/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { useUser } from "~/components/app-context";
import { ItemImage } from "~/components/item-image";
import { CurrencyDisplay } from "~/components/currency-display";
import { ModalButton } from "~/components/modal-button";
import { wearToString } from "~/utils/economy";

interface MarketplaceListing {
  id: string;
  userId: string;
  itemUid: number;
  itemData: string;
  price: string;
  status: string;
  createdAt: string;
  seller: {
    id: string;
    name: string;
    avatar: string;
  };
}

export function MarketplacePurchaseModal({
  listing,
  isOwn,
  onClose
}: {
  listing: MarketplaceListing;
  isOwn: boolean;
  onClose: () => void;
}) {
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const item = JSON.parse(listing.itemData);
  const economyItem = CS2Economy.get(item.id);
  const userBalance = (user as any)?.coins || "0";
  const hasEnoughFunds = parseFloat(userBalance) >= parseFloat(listing.price);

  const handlePurchase = async () => {
    if (isOwn) return;
    if (!hasEnoughFunds) {
      setError("Nincs elegendő pénzed!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "purchase_listing",
          listingId: listing.id
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("Sikeres vásárlás! Az item hozzá lett adva a leltáradhoz.");
        onClose();
        window.location.reload(); // Refresh to update inventory and balance
      } else {
        setError(data.message || "Hiba történt a vásárlás során");
      }
    } catch (err) {
      setError("Hálózati hiba történt");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!isOwn) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_listing",
          listingId: listing.id
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("Hirdetés visszavonva!");
        onClose();
      } else {
        setError(data.message || "Hiba történt a visszavonás során");
      }
    } catch (err) {
      setError("Hálózati hiba történt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-white"
        >
          ✕
        </button>

        {/* Item Display */}
        <div className="mb-6">
          <div className="mb-4 flex justify-center">
            <ItemImage
              className="h-48 w-48 object-contain"
              item={economyItem}
            />
          </div>

          <h2 className="font-display mb-2 text-center text-xl font-bold text-white">
            {economyItem.name}
          </h2>

          {item.wear !== undefined && (
            <p className="text-center text-sm text-neutral-400">
              {wearToString(item.wear)}
            </p>
          )}
        </div>

        {/* Seller Info */}
        <div className="mb-4 rounded-lg border border-neutral-700 bg-black/30 p-4">
          <div className="mb-2 flex items-center gap-3">
            <img
              src={listing.seller.avatar}
              alt={listing.seller.name}
              className="h-10 w-10 rounded-full border border-neutral-600"
            />
            <div>
              <p className="text-xs text-neutral-400">
                {isOwn ? "Te" : "Eladó"}
              </p>
              <p className="font-display font-medium text-white">
                {listing.seller.name}
              </p>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4 rounded-lg border border-purple-500/30 bg-purple-900/20 p-4">
          <p className="mb-2 text-center text-sm text-neutral-400">Ár</p>
          <div className="flex justify-center">
            <CurrencyDisplay
              amount={listing.price}
              className="text-2xl font-bold text-yellow-400"
              showIcon={true}
            />
          </div>
        </div>

        {/* User Balance */}
        {!isOwn && user && (
          <div className="mb-4 rounded-lg border border-neutral-700 bg-black/20 p-4">
            <p className="mb-2 text-center text-sm text-neutral-400">
              Jelenlegi egyenleged
            </p>
            <div className="flex justify-center">
              <CurrencyDisplay
                amount={userBalance}
                className="text-xl font-bold text-green-400"
                showIcon={true}
              />
            </div>
            {!hasEnoughFunds && (
              <p className="mt-2 text-center text-sm text-red-400">
                Nincs elegendő pénzed!
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3">
            <p className="text-center text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isOwn ? (
            <>
              <ModalButton
                onClick={handleCancel}
                disabled={loading}
                variant="primary"
                className="flex-1"
              >
                {loading ? "Betöltés..." : "Hirdetés visszavonása"}
              </ModalButton>
              <ModalButton onClick={onClose} variant="secondary">
                Bezár
              </ModalButton>
            </>
          ) : (
            <>
              <ModalButton
                onClick={handlePurchase}
                disabled={loading || !hasEnoughFunds}
                variant="primary"
                className="flex-1"
              >
                {loading ? "Vásárlás..." : "Megveszem"}
              </ModalButton>
              <ModalButton onClick={onClose} variant="secondary">
                Mégse
              </ModalButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
