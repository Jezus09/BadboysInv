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
      <div className="w-full max-w-[140px]">
        <div
          className={clsx(
            "group relative cursor-pointer rounded-lg bg-gradient-to-b from-neutral-700 to-neutral-500 p-[2px] transition-all duration-300 hover:scale-105",
            selected && "ring-opacity-75 scale-105 ring-3 ring-blue-400",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onClick={!disabled ? onClick : undefined}
          ref={ref}
          {...getHoverReferenceProps()}
        >
          <div className="flex min-h-[150px] flex-col rounded-lg bg-gradient-to-b from-neutral-800 to-neutral-600 p-3">
            <div className="relative mb-3 flex flex-1 items-center justify-center">
              {economyItem ? (
                <ItemImage
                  className="h-[75px] w-[100px] object-contain"
                  item={economyItem}
                  wear={item.wear}
                />
              ) : (
                <div className="flex h-[75px] w-[100px] items-center justify-center rounded bg-gray-700">
                  <span className="text-xs text-gray-400">Unknown</span>
                </div>
              )}
            </div>

            <div className="rounded bg-black/20 p-2 text-center">
              <div className="text-xs leading-tight text-white">
                {has(model) && (
                  <div className="mb-1 truncate text-sm font-bold">{model}</div>
                )}
                {has(name) && (
                  <div className="truncate text-xs text-neutral-300">
                    {name}
                  </div>
                )}
              </div>
            </div>
          </div>
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
