/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { createPortal } from "react-dom";
import { ClientOnly } from "remix-utils/client-only";
import { useUser } from "~/components/app-context";
import { ItemImage } from "~/components/item-image";
import { CurrencyDisplay } from "~/components/currency-display";
import { ModalButton } from "~/components/modal-button";
import { MarketplacePriceChart } from "~/components/marketplace-price-chart";
import { Overlay } from "~/components/overlay";
import { UseItemFooter } from "~/components/use-item-footer";
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
        window.location.reload();
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
    <ClientOnly
      children={() =>
        createPortal(
          <Overlay className="m-auto w-full max-h-[90vh] overflow-y-auto px-2 lg:px-0 lg:w-[800px]">
            {/* Item Header with Rarity Border */}
            <div className="flex items-center justify-center px-2">
              <div
                className="flex items-center justify-center gap-2 border-b-4 px-1 pb-2"
                style={{ borderColor: economyItem.rarity }}
              >
                {economyItem.category !== undefined && (
                  <ItemImage
                    className="h-12 lg:h-16"
                    item={economyItem}
                  />
                )}
                <div className="font-display">
                  <div className="text-xl lg:text-3xl">{economyItem.name}</div>
                  {item.wear !== undefined && (
                    <div className="-mt-1 lg:-mt-2 text-xs lg:text-base text-neutral-300">
                      {wearToString(item.wear)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Item Image */}
            <div className="text-center">
              <div className="relative mx-auto inline-block">
                <ItemImage
                  className="m-auto my-4 lg:my-8 max-w-[280px] lg:max-w-[512px]"
                  item={economyItem}
                />
                {/* Stickers Display */}
                {item.stickers !== undefined &&
                  Object.keys(item.stickers).length > 0 && (
                    <div className="absolute bottom-0 left-0 flex items-center justify-center">
                      {Object.entries(item.stickers).map(
                        ([slot, sticker]: [string, any]) => (
                          <span className="inline-block" key={slot}>
                            <ItemImage
                              className="w-[64px] lg:w-[128px]"
                              item={CS2Economy.getById(sticker.id)}
                              style={{
                                filter: `grayscale(${sticker.wear ?? 0})`,
                                opacity: `${1 - (sticker.wear ?? 0)}`
                              }}
                            />
                          </span>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 gap-3 lg:gap-4 px-2 lg:px-4 pb-4 lg:grid-cols-2">
              {/* Left Column - Seller & Balance */}
              <div className="space-y-3 lg:space-y-4">
                {/* Seller Info */}
                <div className="rounded-lg border border-neutral-700 bg-black/30 p-3 lg:p-4">
                  <div className="mb-2 flex items-center gap-2 lg:gap-3">
                    <img
                      src={listing.seller.avatar}
                      alt={listing.seller.name}
                      className="h-10 w-10 lg:h-12 lg:w-12 rounded-full border-2 border-neutral-600"
                    />
                    <div>
                      <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-neutral-400">
                        {isOwn ? "Te" : "Eladó"}
                      </p>
                      <p className="font-display text-base lg:text-lg font-medium text-white">
                        {listing.seller.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Balance */}
                {!isOwn && user && (
                  <div className="rounded-lg border border-neutral-700 bg-black/30 p-3 lg:p-4">
                    <p className="mb-2 text-center text-[10px] lg:text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Jelenlegi egyenleged
                    </p>
                    <div className="flex justify-center">
                      <CurrencyDisplay
                        amount={userBalance}
                        className="text-xl lg:text-2xl font-bold text-green-400"
                        showIcon={true}
                      />
                    </div>
                    {!hasEnoughFunds && (
                      <p className="mt-2 text-center text-xs lg:text-sm font-bold text-red-400">
                        ⚠ Nincs elegendő pénzed!
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Price & Chart */}
              <div className="space-y-3 lg:space-y-4">
                {/* Price */}
                <div
                  className="rounded-lg border-2 p-3 lg:p-4"
                  style={{
                    borderColor: economyItem.rarity,
                    background: `linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)`
                  }}
                >
                  <p className="mb-2 text-center text-[10px] lg:text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Ár
                  </p>
                  <div className="flex justify-center">
                    <CurrencyDisplay
                      amount={listing.price}
                      className="text-2xl lg:text-3xl font-bold text-yellow-400"
                      showIcon={true}
                    />
                  </div>
                </div>

                {/* Price History Chart */}
                <div className="rounded-lg border border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800 p-2 lg:p-4">
                  <MarketplacePriceChart
                    itemId={item.id}
                    wear={item.wear}
                    className=""
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-2 lg:mx-4 mb-3 lg:mb-4 rounded-lg border border-red-500/50 bg-red-900/30 p-2 lg:p-3">
                <p className="text-center text-xs lg:text-sm font-bold text-red-400">
                  ⚠ {error}
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <UseItemFooter
              left={<></>}
              right={
                <div className="flex gap-2 w-full">
                  {isOwn ? (
                    <>
                      <ModalButton
                        onClick={handleCancel}
                        disabled={loading}
                        variant="primary"
                        className="flex-1 text-sm lg:text-base py-2 lg:py-3"
                      >
                        {loading ? "Betöltés..." : "Visszavonás"}
                      </ModalButton>
                      <ModalButton
                        onClick={onClose}
                        variant="secondary"
                        className="flex-1 text-sm lg:text-base py-2 lg:py-3"
                      >
                        Bezár
                      </ModalButton>
                    </>
                  ) : (
                    <>
                      <ModalButton
                        onClick={handlePurchase}
                        disabled={loading || !hasEnoughFunds}
                        variant="primary"
                        className="flex-1 text-sm lg:text-base py-2 lg:py-3"
                      >
                        {loading ? "Vásárlás..." : "Megveszem"}
                      </ModalButton>
                      <ModalButton
                        onClick={onClose}
                        variant="secondary"
                        className="flex-1 text-sm lg:text-base py-2 lg:py-3"
                      >
                        Mégse
                      </ModalButton>
                    </>
                  )}
                </div>
              }
            />
          </Overlay>,
          document.body
        )
      }
    />
  );
}
