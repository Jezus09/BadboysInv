/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { faCartShopping, faCoins, faKey, faBox } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { CurrencyDisplay } from "./currency-display";

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

export function ShopGrid() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const fetcher = useFetcher();
  const purchaseFetcher = useFetcher();

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

  const handlePurchase = (shopItemId: string) => {
    purchaseFetcher.submit(
      { action: "purchase", shopItemId },
      { method: "POST", action: "/api/shop" }
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "key": return faKey;
      case "case": return faBox;
      default: return faCartShopping;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case "key": return "Kulcsok";
      case "case": return "Ládák";
      default: return "Egyéb";
    }
  };

  const categories = [
    { value: "all", label: "Összes" },
    { value: "key", label: "Kulcsok" },
    { value: "case", label: "Ládák" }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <FontAwesomeIcon
                icon={getCategoryIcon(item.category)}
                className="h-8 w-8 text-blue-400"
              />
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                {getCategoryName(item.category)}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">
              {item.name}
            </h3>
            
            {item.description && (
              <p className="text-gray-400 text-sm mb-4">
                {item.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <CurrencyDisplay 
                amount={item.price} 
                className="text-lg font-bold"
                showIcon={true}
              />
              
              <button
                onClick={() => handlePurchase(item.id)}
                disabled={purchaseFetcher.state === "submitting"}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {purchaseFetcher.state === "submitting" ? (
                  "Vásárlás..."
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCartShopping} className="mr-2" />
                    Vásárlás
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && !loading && (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faCartShopping} className="h-16 w-16 text-gray-600 mb-4" />
          <h3 className="text-xl text-gray-400 mb-2">Nincsenek elérhető termékek</h3>
          <p className="text-gray-500">Próbáld meg később vagy válassz másik kategóriát.</p>
        </div>
      )}

      {/* Purchase Result */}
      {purchaseFetcher.data && (
        <div className={`mt-4 p-4 rounded-lg ${
          purchaseFetcher.data.success 
            ? "bg-green-800 text-green-200" 
            : "bg-red-800 text-red-200"
        }`}>
          {purchaseFetcher.data.message}
        </div>
      )}
    </div>
  );
}