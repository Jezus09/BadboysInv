/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2Economy } from "@ianlucas/cs2-lib";
import { FloatingFocusManager } from "@floating-ui/react";
import { createPortal } from "react-dom";
import { ClientOnly } from "remix-utils/client-only";
import { ItemImage } from "~/components/item-image";
import { CurrencyDisplay } from "~/components/currency-display";
import { TradeItemTooltip } from "~/components/trade-item-tooltip";
import { useInventoryItemFloating } from "~/components/hooks/use-inventory-item-floating";
import { createFakeInventoryItem } from "~/utils/inventory";
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

export function MarketplaceItemCard({
  listing,
  isOwn,
  onClick
}: {
  listing: MarketplaceListing;
  isOwn: boolean;
  onClick: () => void;
}) {
  const item = JSON.parse(listing.itemData);
  const economyItem = CS2Economy.get(item.id);

  const {
    getHoverFloatingProps,
    getHoverReferenceProps,
    hoverContext,
    hoverRefs,
    hoverStyles,
    isHoverOpen,
    ref
  } = useInventoryItemFloating();

  // Create a proper inventory item for the tooltip
  const inventoryItem = createFakeInventoryItem(economyItem, {
    wear: item.wear,
    seed: item.seed,
    statTrak: item.statTrak,
    nameTag: item.nameTag,
    stickers: item.stickers || {},
    patches: item.patches || {}
  });

  return (
    <>
      <div
        onClick={onClick}
        ref={ref}
        {...getHoverReferenceProps()}
        className="group relative cursor-pointer transition-all hover:drop-shadow-[0_0_5px_rgba(0,0,0,1)]"
      >
      <div className="relative w-full overflow-hidden rounded-sm border border-neutral-700 bg-gradient-to-b from-neutral-800 to-neutral-900 transition-all group-hover:border-purple-500/50">
        {/* Item Image */}
        <div className="relative aspect-[4/3] p-4">
          <ItemImage
            className="h-full w-full object-contain"
            item={economyItem}
          />

          {/* Wear/Rarity badge */}
          {item.wear !== undefined && (
            <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
              {wearToString(item.wear)}
            </div>
          )}

          {/* Own listing badge */}
          {isOwn && (
            <div className="absolute top-2 right-2 rounded bg-green-600/80 px-2 py-1 text-xs font-bold text-white">
              SAJÁT
            </div>
          )}
        </div>

        {/* Item Info */}
        <div className="border-t border-neutral-700 bg-black/30 p-3">
          {/* Item Name */}
          <div className="mb-2 min-h-[2.5rem]">
            <h3 className="font-display line-clamp-2 text-sm font-medium text-white">
              {economyItem.name}
            </h3>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <CurrencyDisplay
              amount={listing.price}
              className="text-base font-bold text-yellow-400"
              showIcon={true}
            />
          </div>

          {/* Seller Info */}
          <div className="mt-2 flex items-center gap-2 border-t border-neutral-700/50 pt-2">
            <img
              src={listing.seller.avatar}
              alt={listing.seller.name}
              className="h-5 w-5 rounded-full"
            />
            <span className="truncate text-xs text-neutral-400">
              {listing.seller.name}
            </span>
          </div>
        </div>
      </div>
      </div>

      {/* Tooltip using Portal */}
      {inventoryItem && isHoverOpen && (
        <ClientOnly
          children={() =>
            createPortal(
              <FloatingFocusManager context={hoverContext} modal={false}>
                <TradeItemTooltip
                  forwardRef={hoverRefs.setFloating}
                  style={hoverStyles}
                  {...getHoverFloatingProps()}
                  item={inventoryItem}
                />
              </FloatingFocusManager>,
              document.body
            )
          }
        />
      )}
    </>
  );
}
