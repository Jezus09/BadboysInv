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
        const url =
          selectedCategory === "all"
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
    { value: "all", label: "Összes" },
    { value: "key", label: "Kulcsok" },
    { value: "weapon-case", label: "Fegyver ládák" },
    { value: "sticker-capsule", label: "Matrica kapszulák" },
    { value: "graffiti-box", label: "Graffiti dobozok" },
    { value: "souvenir-case", label: "Souvenir ládák" },
    { value: "other-container", label: "Egyéb ládák" }
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
              <h1 className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-6xl font-black text-transparent drop-shadow-2xl">
                SHOP
              </h1>
              <div className="absolute inset-0 text-6xl font-black text-yellow-400/20 blur-sm">
                SHOP
              </div>
            </div>

            {/* Description - Centered */}
            <div className="mb-4 text-center">
              <p className="font-display text-lg font-medium text-neutral-300">
                Vásárolj kulcsokat és ládákat a pénzedből
              </p>
            </div>

            {/* Balance - Right aligned */}
            <div className="mb-6 flex justify-center md:justify-end">
              {user && (
                <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-4 py-2">
                  <span className="font-semibold text-green-400">
                    Egyenleg:
                  </span>
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
            <div className="flex flex-wrap justify-center gap-4">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                    selectedCategory === category.value ? "bg-black/30" : ""
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-neutral-400">Betöltés...</div>
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
            <div className="py-12 text-center">
              <h3 className="mb-2 text-xl text-neutral-400">
                Nincsenek elérhető termékek
              </h3>
              <p className="text-neutral-500">
                Próbáld meg később vagy válassz másik kategóriát.
              </p>
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
