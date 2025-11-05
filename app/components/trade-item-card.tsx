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
      patches: item.patches || {},
      keychains: item.keychains || {}
    });
  } catch {
    name = "Unknown Item";
  }

  return (
    <>
      <div className="w-full max-w-[140px]">
        <div
          className={clsx(
            "group relative bg-gradient-to-b from-neutral-700 to-neutral-500 p-[2px] rounded-lg cursor-pointer transition-all duration-300 hover:scale-105",
            selected && "ring-3 ring-blue-400 ring-opacity-75 scale-105",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={!disabled ? onClick : undefined}
          ref={ref}
          {...getHoverReferenceProps()}
        >
          <div className="bg-gradient-to-b from-neutral-800 to-neutral-600 p-3 rounded-lg min-h-[150px] flex flex-col">
            <div className="relative flex-1 flex items-center justify-center mb-3">
              {economyItem ? (
                <ItemImage
                  className="w-[100px] h-[75px] object-contain"
                  item={economyItem}
                  wear={item.wear}
                />
              ) : (
                <div className="w-[100px] h-[75px] bg-gray-700 rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Unknown</span>
                </div>
              )}

              {/* Stickers display */}
              {item.stickers && Object.keys(item.stickers).length > 0 && (
                <div className="absolute bottom-0 left-0 flex items-center gap-0.5">
                  {Object.entries(item.stickers).slice(0, 4).map(([slot, sticker]: [string, any]) => (
                    <ItemImage
                      className="h-4"
                      item={CS2Economy.getById(sticker.id)}
                      key={slot}
                    />
                  ))}
                </div>
              )}

              {/* Patches display */}
              {item.patches && Object.keys(item.patches).length > 0 && (
                <div className="absolute top-0 left-0 flex items-center gap-0.5">
                  {Object.entries(item.patches).slice(0, 3).map(([slot, patchId]: [string, any]) => (
                    <ItemImage
                      className="h-4"
                      item={CS2Economy.getById(patchId)}
                      key={slot}
                    />
                  ))}
                </div>
              )}

              {/* Keychains display */}
              {item.keychains && Object.keys(item.keychains).length > 0 && (
                <div className="absolute bottom-0 right-0 flex items-center gap-0.5">
                  {Object.entries(item.keychains).slice(0, 2).map(([slot, keychain]: [string, any]) => (
                    <ItemImage
                      className="h-4"
                      item={CS2Economy.getById(keychain.id)}
                      key={slot}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-center bg-black/20 rounded p-2">
              <div className="text-xs text-white leading-tight">
                {has(model) && (
                  <div className="font-bold truncate mb-1 text-sm">
                    {model}
                  </div>
                )}
                {has(name) && <div className="truncate text-neutral-300 text-xs">{name}</div>}
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
