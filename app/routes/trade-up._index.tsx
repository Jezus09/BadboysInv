/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, useLoaderData, useFetcher, Link, useNavigate } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/auth.server";
import { getUserInventory } from "~/models/user.server";
import { useUser } from "~/components/app-context";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { parseInventory, createFakeInventoryItem } from "~/utils/inventory";
import { InventoryItemTile } from "~/components/inventory-item-tile";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const inventoryString = await getUserInventory(user.id);
  const parsedInventoryData = parseInventory(inventoryString);

  let inventory: any[] = [];
  if (parsedInventoryData && parsedInventoryData.items) {
    inventory = Object.entries(parsedInventoryData.items).map(([uid, item]: [string, any]) => ({
      ...item,
      uid: parseInt(uid)
    }));
  }

  return data({ inventory: inventory || [] });
}

const RARITY_ORDER = [
  "consumer grade",
  "industrial grade",
  "mil-spec",
  "mil-spec grade",
  "restricted",
  "classified",
  "covert",
  "contraband"
];

const RARITY_COLORS: Record<string, string> = {
  "consumer grade": "#b0c3d9",
  "industrial grade": "#5e98d9",
  "mil-spec": "#4b69ff",
  "mil-spec grade": "#4b69ff",
  "restricted": "#8847ff",
  "classified": "#d32ce6",
  "covert": "#eb4b4b",
  "contraband": "#e4ae39"
};

function getRarityIndex(rarity: string): number {
  const index = RARITY_ORDER.indexOf(rarity.toLowerCase());
  return index === -1 ? 0 : index;
}

function getNextRarity(rarity: string): string | null {
  const currentIndex = getRarityIndex(rarity);
  if (currentIndex >= RARITY_ORDER.length - 1) {
    return null; // Already max rarity
  }
  return RARITY_ORDER[currentIndex + 1];
}

export default function TradeUpPage() {
  const { inventory } = useLoaderData<typeof loader>();
  const user = useUser();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  // Refresh page when trade up is successful
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      // Clear selection and refresh
      setSelectedItems([]);
      // Navigate to same page to refresh data
      navigate("/trade-up", { replace: true });
    }
  }, [fetcher.state, fetcher.data, navigate]);

  // Filter inventory to only show skins (not cases, stickers, etc)
  const eligibleItems = inventory.filter((item: any) => {
    const economyItem = CS2Economy.getById(item.id);
    return economyItem.type === "weapon" && economyItem.rarity && economyItem.rarity !== "contraband";
  });

  const handleItemClick = (item: any) => {
    if (selectedItems.length >= 10) {
      return;
    }

    // Check if same rarity as already selected items
    if (selectedItems.length > 0) {
      const firstItemRarity = CS2Economy.getById(selectedItems[0].id).rarity;
      const clickedItemRarity = CS2Economy.getById(item.id).rarity;

      if (firstItemRarity.toLowerCase() !== clickedItemRarity.toLowerCase()) {
        alert("All items must be the same rarity!");
        return;
      }
    }

    setSelectedItems([...selectedItems, item]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleTradeUp = async () => {
    if (selectedItems.length !== 10) {
      console.log("[TradeUp] Not enough items:", selectedItems.length);
      return;
    }

    const itemUids = selectedItems.map(item => item.uid);
    console.log("[TradeUp] Submitting trade up with UIDs:", itemUids);

    const formData = new FormData();
    formData.append("itemUids", JSON.stringify(itemUids));

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/trade-up"
    });
  };

  const canTradeUp = selectedItems.length === 10;
  const selectedRarity = selectedItems.length > 0
    ? CS2Economy.getById(selectedItems[0].id).rarity
    : null;
  const resultRarity = selectedRarity ? getNextRarity(selectedRarity) : null;

  return (
    <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
      <div className="my-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="relative mb-6">
            <h1 className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-6xl font-black text-transparent drop-shadow-2xl">
              TRADE UP CONTRACT
            </h1>
            <div className="absolute inset-0 text-6xl font-black text-yellow-400/20 blur-sm">
              TRADE UP CONTRACT
            </div>
          </div>

          <div className="mb-4 text-center">
            <p className="font-display text-lg font-medium text-neutral-300">
              10 azonos rarity item → 1 magasabb rarity item
            </p>
          </div>

          <div className="mb-6">
            <Link
              to="/"
              className="font-display inline-flex items-center gap-2 rounded border border-gray-500/30 bg-gray-600/20 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70"
            >
              ← Vissza az inventoryhoz
            </Link>
          </div>
        </div>

        {/* Selected Items Area */}
        <div className="mb-8 rounded-lg border-2 border-yellow-500/30 bg-black/30 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-white">
              Kiválasztott itemek ({selectedItems.length}/10)
            </h2>
            {selectedRarity && resultRarity && (
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-sm text-neutral-400">Jelenlegi</div>
                  <div
                    className="font-display font-bold"
                    style={{ color: RARITY_COLORS[selectedRarity.toLowerCase()] || "#fff" }}
                  >
                    {selectedRarity.toUpperCase()}
                  </div>
                </div>
                <div className="text-3xl text-yellow-400">→</div>
                <div className="text-center">
                  <div className="text-sm text-neutral-400">Eredmény</div>
                  <div
                    className="font-display font-bold"
                    style={{ color: RARITY_COLORS[resultRarity.toLowerCase()] || "#fff" }}
                  >
                    {resultRarity.toUpperCase()}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-4 min-h-[200px]">
            {selectedItems.map((item, index) => {
              const economyItem = CS2Economy.getById(item.id);
              const fakeItem = createFakeInventoryItem(economyItem, item);
              return (
                <div key={index} className="relative">
                  <InventoryItemTile
                    item={fakeItem}
                    onClick={() => handleRemoveItem(index)}
                  />
                  <div className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    ✕
                  </div>
                </div>
              );
            })}
            {Array.from({ length: 10 - selectedItems.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex h-[180px] items-center justify-center rounded border-2 border-dashed border-neutral-700 bg-neutral-900/50"
              >
                <span className="text-4xl text-neutral-700">?</span>
              </div>
            ))}
          </div>

          {/* Contract Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleTradeUp}
              disabled={!canTradeUp || fetcher.state !== "idle"}
              className="font-display inline-flex items-center gap-2 rounded border border-yellow-500/30 bg-yellow-600/20 px-4 py-2 text-lg transition-all hover:bg-black/30 active:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fetcher.state !== "idle" ? "Feldolgozás..." : "✍ Contract aláírása"}
            </button>
          </div>
        </div>

        {/* Inventory Grid */}
        <div className="mb-8">
          <h2 className="font-display mb-4 text-2xl font-bold text-white">
            Inventory ({eligibleItems.length} alkalmas item)
          </h2>

          {eligibleItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-display text-lg text-neutral-400">
                Nincs Trade Up-ra alkalmas item az inventoryban
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {eligibleItems.map((item: any) => {
                const isSelected = selectedItems.some(s => s.uid === item.uid);
                const economyItem = CS2Economy.getById(item.id);
                const fakeItem = createFakeInventoryItem(economyItem, item);

                // Check if this item can be selected based on current selection
                const canSelect = selectedItems.length === 0 ||
                  economyItem.rarity.toLowerCase() === CS2Economy.getById(selectedItems[0].id).rarity.toLowerCase();

                const isDisabled = isSelected || !canSelect;

                return (
                  <div
                    key={item.uid}
                    className={isDisabled ? "opacity-30 pointer-events-none" : "cursor-pointer hover:opacity-80 transition-opacity"}
                  >
                    <InventoryItemTile
                      item={fakeItem}
                      onClick={() => handleItemClick(item)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
