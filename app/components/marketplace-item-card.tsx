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
      <div className="w-[154px]">
        <div className="group relative bg-linear-to-b from-neutral-600 to-neutral-400 p-[1px]">
          <div className="bg-linear-to-b from-neutral-500 to-neutral-300 px-1">
            <ItemImage className="w-[144px]" item={economyItem} />
          </div>

          {/* Own listing badge */}
          {isOwn && (
            <div className="absolute top-[1px] left-[1px] bg-green-600 px-1 py-1 text-[10px] font-bold text-green-200 shadow-lg transition-all group-hover:text-white">
              SAJÁT
            </div>
          )}

          {/* Stickers display */}
          {item.stickers && Object.keys(item.stickers).length > 0 && (
            <div className="absolute bottom-0 left-0 flex items-center p-1">
              {Object.entries(item.stickers).map(([slot, sticker]: [string, any]) => (
                <ItemImage
                  className="h-5"
                  item={CS2Economy.getById(sticker.id)}
                  key={slot}
                />
              ))}
            </div>
          )}

          {/* Patches display */}
          {item.patches && Object.keys(item.patches).length > 0 && (
            <div className="absolute bottom-0 left-0 flex items-center p-1">
              {Object.entries(item.patches).map(([slot, patchId]: [string, any]) => (
                <ItemImage
                  className="h-5"
                  item={CS2Economy.getById(patchId)}
                  key={slot}
                />
              ))}
            </div>
          )}

          <button
            className="absolute top-0 left-0 h-full w-full border-4 border-transparent transition-all hover:border-white"
            onClick={onClick}
            ref={ref}
            {...getHoverReferenceProps()}
          />
        </div>

        {/* Rarity line */}
        <div
          className="h-1 shadow-sm shadow-black/50"
          style={{ backgroundColor: economyItem.rarity }}
        />

        {/* Item name and price */}
        <div className="font-display mt-1 text-[12px] leading-3 break-words text-white drop-shadow-[0_0_1px_rgba(0,0,0,1)]">
          <div className="font-bold">{economyItem.name}</div>
          {item.wear !== undefined && (
            <div className="text-neutral-400">{wearToString(item.wear)}</div>
          )}
          <div className="mt-1 flex items-center gap-1">
            <CurrencyDisplay
              amount={listing.price}
              className="text-sm font-bold text-yellow-400"
              showIcon={true}
            />
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
