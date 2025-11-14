/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, useLoaderData } from "react-router";
import { requireUser } from "~/auth.server";
import { ShopItemCard } from "~/components/shop-item-card";
import { ShopPurchaseModal } from "~/components/shop-purchase-modal";
import { CurrencyDisplay } from "~/components/currency-display";
import { useInventory, useUser } from "~/components/app-context";
import type { Route } from "./+types/shop._index";
import { useTranslate } from "~/components/app-context";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return data({});
}

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

export default function ShopPage() {
  useLoaderData<typeof loader>();
  const translate = useTranslate();
  const [inventory] = useInventory();
  const user = useUser();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  // Fetch shop items
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const url = selectedCategory === "all" 
          ? "/api/shop" 
          : `/api/shop?category=${selectedCategory}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          setItems(data.items);
        }
      } catch (error) {
        console.error("Failed to fetch shop items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [selectedCategory]);

  const categories = [
    { value: "all", label: translate("ShopFilterAll") },
    { value: "key", label: translate("ShopFilterKeys") },
    { value: "weapon-case", label: translate("ShopFilterWeaponCase") },
    { value: "sticker-capsule", label: translate("ShopFilterStickerCapsule") },
    { value: "graffiti-box", label: translate("ShopFilterGraffitiBox") },
    { value: "souvenir-case", label: translate("ShopFilterSouvenirCase") },
    { value: "other-container", label: translate("ShopFilterOtherContainer") }
  ];

  const inventoryIsFull = inventory.isFull();

  return (
    <>
      <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
        <div className="my-8">
          {/* Header */}
          <div className="mb-8 text-center">
            {/* Shop Title */}
            <div className="relative mb-6">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-2xl">
                {translate("ShopTitle")}
              </h1>
              <div className="absolute inset-0 text-6xl font-black text-yellow-400/20 blur-sm">
                {translate("ShopTitle")}
              </div>
            </div>

            {/* Description - Centered */}
            <div className="text-center mb-4">
              <p className="font-display text-lg text-neutral-300 font-medium">
                {translate("ShopDescription")}
              </p>
            </div>

            {/* Balance - Right aligned */}
            <div className="flex justify-center md:justify-end mb-6">
              {user && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-lg px-4 py-2">
                  <span className="text-green-400 font-semibold">{translate("Balance")}</span>
                  <CurrencyDisplay 
                    amount={(user as any).coins} 
                    className="text-xl font-bold text-green-300"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex gap-4 flex-wrap justify-center">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                    selectedCategory === category.value
                      ? "bg-black/30"
                      : ""
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-neutral-400">{translate("ShopLoading")}</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  disabled={inventoryIsFull}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          )}

          {items.length === 0 && !loading && (
            <div className="text-center py-12">
              <h3 className="text-xl text-neutral-400 mb-2">{translate("ShopEmpty")}</h3>
              <p className="text-neutral-500">{translate("ShopEmptySub")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {selectedItem && (
        <ShopPurchaseModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          disabled={inventoryIsFull}
        />
      )}
    </>
  );
}