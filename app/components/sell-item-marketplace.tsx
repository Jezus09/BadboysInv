/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { ItemImage } from "~/components/item-image";
import { CurrencyDisplay } from "~/components/currency-display";
import { ModalButton } from "~/components/modal-button";

export function SellItemMarketplace({
  item,
  onClose
}: {
  item: any;
  onClose: () => void;
}) {
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const economyItem = CS2Economy.get(item.id);

  const handleSell = async () => {
    const priceNum = parseFloat(price);

    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Adj meg egy érvényes árat!");
      return;
    }

    if (priceNum > 1000000) {
      setError("Az ár túl magas! Maximum: 1,000,000");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_listing",
          itemUid: item.uid,
          price: priceNum
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("Sikeres hirdetés feladás! Az item megjelent a piactéren.");
        onClose();
        window.location.reload(); // Refresh to update listings
      } else {
        setError(data.message || "Hiba történt a hirdetés feladása során");
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

        {/* Header */}
        <h2 className="font-display mb-6 text-center text-2xl font-bold text-white">
          Eladás a piactéren
        </h2>

        {/* Item Display */}
        <div className="mb-6">
          <div className="mb-4 flex justify-center">
            <ItemImage
              className="h-48 w-48 object-contain"
              item={economyItem}
            />
          </div>

          <h3 className="font-display mb-2 text-center text-lg font-bold text-white">
            {economyItem.name}
          </h3>

          {item.wear !== undefined && (
            <p className="text-center text-sm text-neutral-400">
              {economyItem.getWearName(item.wear)}
            </p>
          )}
        </div>

        {/* Price Input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            Ár megadása
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="1000000"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Pl. 1000"
              className="font-display w-full rounded border border-neutral-700 bg-black/30 px-4 py-3 text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="text-yellow-400">💰</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            A hirdetés 7 napig lesz aktív
          </p>
        </div>

        {/* Preview */}
        {price && !isNaN(parseFloat(price)) && parseFloat(price) > 0 && (
          <div className="mb-4 rounded-lg border border-purple-500/30 bg-purple-900/20 p-4">
            <p className="mb-2 text-center text-sm text-neutral-400">
              Eladási ár
            </p>
            <div className="flex justify-center">
              <CurrencyDisplay
                amount={price}
                className="text-2xl font-bold text-yellow-400"
                showIcon={true}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3">
            <p className="text-center text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Warning */}
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-3">
          <p className="text-center text-xs text-yellow-400">
            ⚠️ Az item eltávolításra kerül a leltáradból a hirdetés feladásakor
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <ModalButton
            onClick={handleSell}
            disabled={loading || !price || parseFloat(price) <= 0}
            variant="primary"
            className="flex-1"
          >
            {loading ? "Feladás..." : "Hirdetés feladása"}
          </ModalButton>
          <ModalButton onClick={onClose} variant="secondary">
            Mégse
          </ModalButton>
        </div>
      </div>
    </div>
  );
}
