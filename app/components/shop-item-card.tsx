/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { faKey, faBox, faCartShopping } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CS2Economy } from "@ianlucas/cs2-lib";
import clsx from "clsx";
import { CurrencyDisplay } from "./currency-display";
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

export function ShopItemCard({
  item,
  disabled,
  onClick
}: {
  item: ShopItem;
  disabled?: boolean;
  onClick?: () => void;
}) {
  // Get the CS2 economy item for image display
  const getEconomyItem = () => {
    if (item.itemId) {
      try {
        return CS2Economy.getById(item.itemId);
      } catch (error) {
        console.warn(`Failed to get economy item for ID ${item.itemId}:`, error);
        return null;
      }
    }
    return null;
  };

  const economyItem = getEconomyItem();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "key": return "from-yellow-500 to-orange-500";
      case "weapon-case": return "from-blue-500 to-purple-500";
      case "sticker-capsule": return "from-pink-500 to-red-500";
      case "graffiti-box": return "from-green-500 to-cyan-500";
      case "souvenir-case": return "from-orange-500 to-yellow-500";
      case "other-container": return "from-purple-500 to-blue-500";
      default: return "from-gray-500 to-gray-600";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "key": return "Kulcs";
      case "weapon-case": return "Fegyver láda";
      case "sticker-capsule": return "Matrica kapszula";
      case "graffiti-box": return "Graffiti doboz";
      case "souvenir-case": return "Souvenir láda";
      case "other-container": return "Egyéb láda";
      default: return "Item";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "key": return faKey;
      case "weapon-case":
      case "souvenir-case":
      case "other-container": return faBox;
      case "sticker-capsule":
      case "graffiti-box": return faCartShopping;
      default: return faCartShopping;
    }
  };

  return (
    <div className="w-[154px]">
      <button
        className={clsx(
          "group relative w-full bg-linear-to-b from-neutral-600 to-neutral-400 p-[1px] transition-all",
          disabled 
            ? "cursor-not-allowed opacity-50" 
            : "hover:from-yellow-600 hover:to-yellow-400 cursor-pointer"
        )}
        onClick={!disabled ? onClick : undefined}
        disabled={disabled}
        style={{
          // Use CS2 item rarity color for border if available
          background: economyItem ? 
            `linear-gradient(to bottom, ${economyItem.rarity}, ${economyItem.rarity}80)` :
            undefined
        }}
      >
        {/* Background */}
        <div className="bg-linear-to-b from-neutral-500 to-neutral-300 px-1 py-2 min-h-[140px] flex flex-col relative">
          {/* CS2 Item Image or Fallback Icon */}
          {economyItem ? (
            <div className="w-full h-16 flex items-center justify-center mb-2 flex-shrink-0">
              <ItemImage
                item={economyItem}
                className="max-w-full max-h-full object-contain"
                lazy
              />
            </div>
          ) : (
            /* Fallback category icon */
            <div className={clsx(
              "w-12 h-12 rounded-full flex items-center justify-center mb-2 mx-auto flex-shrink-0 bg-gradient-to-br",
              getCategoryColor(item.category)
            )}>
              <FontAwesomeIcon
                icon={getCategoryIcon(item.category)}
                className="h-6 w-6 text-white"
              />
            </div>
          )}
          
          {/* Item name with proper spacing from price */}
          <div className="text-center flex-1 px-1 pb-6">
            <div 
              className="text-xs font-bold text-neutral-800 group-hover:text-black transition-colors leading-tight"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word'
              }}
              title={item.name} // Tooltip for full name
            >
              {item.name}
            </div>
          </div>
        </div>
        
        {/* Price tag */}
        <div className="absolute bottom-1 right-1 bg-black/80 rounded px-1 py-0.5">
          <CurrencyDisplay 
            amount={item.price}
            className="text-xs"
            showIcon={false}
          />
        </div>
        
        {/* Category label - smaller and more transparent */}
        <div className="absolute top-0.5 left-0.5 bg-black/40 backdrop-blur-sm rounded-sm px-1 py-0.5">
          <span className="text-[9px] text-white font-medium uppercase tracking-wide shadow-sm">
            {getCategoryLabel(item.category)}
          </span>
        </div>
        
        {disabled && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              Inventory tele
            </span>
          </div>
        )}
      </button>
    </div>
  );
}