import { CS2Economy } from "@ianlucas/cs2-lib";
import { FloatingFocusManager } from "@floating-ui/react";
import clsx from "clsx";
import { createPortal } from "react-dom";
import { ClientOnly } from "remix-utils/client-only";
import { ItemImage } from "./item-image";
import { TradeItemTooltip } from "./trade-item-tooltip";
import { useNameItem } from "./hooks/use-name-item";
import { useInventoryItemFloating } from "./hooks/use-inventory-item-floating";
import { useTranslate } from "./app-context";
import { has } from "~/utils/misc";
import { createFakeInventoryItem } from "~/utils/inventory";

interface TradeItemCardProps {
  item: any;
  selected?: boolean;
  onClick?: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
}

export function TradeItemCard({
  item,
  selected = false,
  onClick,
  showRemove = false,
  onRemove,
  disabled = false
}: TradeItemCardProps) {
  const nameItem = useNameItem();
  const translate = useTranslate();

  const {
    getHoverFloatingProps,
    getHoverReferenceProps,
    hoverContext,
    hoverRefs,
    hoverStyles,
    isHoverOpen,
    ref
  } = useInventoryItemFloating();

  console.log("TradeItemCard rendered - tooltip system active");

  let economyItem;
  let model = "";
  let name = "";
  let rarityColor = "#b0c3d9";
  let inventoryItem = null;

  try {
    economyItem = CS2Economy.getById(item.id);
    [model, name] = nameItem(economyItem, "inventory-name");
    rarityColor = economyItem.rarity;

    // Create a proper inventory item for the tooltip
    inventoryItem = createFakeInventoryItem(economyItem, {
      wear: item.wear,
      seed: item.seed,
      statTrak: item.statTrak,
      nameTag: item.nameTag,
      stickers: item.stickers || {},
      patches: item.patches || {}
    });
  } catch {
    name = "Unknown Item";
  }

  return (
    <>
      <div className="w-[154px]">
        <div className="group relative bg-linear-to-b from-neutral-600 to-neutral-400 p-[1px]">
          <div className="bg-linear-to-b from-neutral-500 to-neutral-300 px-1">
            {economyItem ? (
              <ItemImage className="w-[144px]" item={economyItem} wear={item.wear} />
            ) : (
              <div className="flex h-[100px] w-[144px] items-center justify-center bg-gray-700">
                <span className="text-xs text-gray-400">Unknown</span>
              </div>
            )}
          </div>
          {/* Stickers display */}
          {inventoryItem?.stickers !== undefined && (
            <div className="absolute bottom-0 left-0 flex items-center p-1">
              {inventoryItem.someStickers().map(([slot, { id }]) => (
                <ItemImage
                  className="h-5"
                  item={CS2Economy.getById(id)}
                  key={slot}
                />
              ))}
            </div>
          )}
          {/* Patches display */}
          {inventoryItem?.patches !== undefined && (
            <div className="absolute bottom-0 left-0 flex items-center p-1">
              {inventoryItem.somePatches().map(([slot, id]) => (
                <ItemImage
                  className="h-5"
                  item={CS2Economy.getById(id)}
                  key={slot}
                />
              ))}
            </div>
          )}
          {/* Selected indicator */}
          {selected && (
            <div className="absolute top-0 right-0 p-2">
              <div className="h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white"></div>
            </div>
          )}
          {onClick !== undefined && (
            <button
              className={clsx(
                "absolute top-0 left-0 h-full w-full border-4 border-transparent transition-all hover:border-white",
                selected && "border-blue-400",
                disabled && "cursor-not-allowed opacity-50"
              )}
              onClick={!disabled ? onClick : undefined}
              ref={ref}
              {...getHoverReferenceProps()}
            />
          )}
        </div>
        {/* Rarity line */}
        <div
          className="h-1 shadow-sm shadow-black/50"
          style={{ backgroundColor: rarityColor }}
        />
        {/* Item name */}
        <div className="font-display mt-1 text-[12px] leading-3 break-words text-white drop-shadow-[0_0_1px_rgba(0,0,0,1)]">
          {has(model) && <div className="font-bold">{model}</div>}
          {has(name) && <div>{name}</div>}
        </div>
      </div>

      {/* Steam-like tooltip using real inventory system with Portal */}
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
