/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TradeItemCard } from "./trade-item-card";

interface TradeInventoryGridProps {
  title: string;
  items: any[];
  selectedItems: any[];
  onItemClick?: (item: any) => void;
  onItemRemove?: (item: any) => void;
  showRemoveButtons?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  className?: string;
}

export function TradeInventoryGrid({
  title,
  items,
  selectedItems,
  onItemClick,
  onItemRemove,
  showRemoveButtons = false,
  maxItems,
  emptyMessage = "No items",
  className = ""
}: TradeInventoryGridProps) {
  const isItemSelected = (item: any) => {
    return selectedItems.some(selected => selected.uid === item.uid);
  };

  const isAtMaxItems = maxItems && selectedItems.length >= maxItems;

  return (
    <div className={`bg-black/30 rounded-lg p-4 border border-neutral-700/50 backdrop-blur-sm ${className}`}>
      <h3 className="font-display text-white font-medium mb-4 flex items-center justify-between">
        <span>{title}</span>
        {maxItems && (
          <span className="font-display text-sm text-neutral-400">
            {selectedItems.length}/{maxItems}
          </span>
        )}
      </h3>
      
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-32 font-display text-neutral-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-4 justify-items-center">
          {items.map((item, index) => {
            const selected = isItemSelected(item);
            const disabled = !selected && Boolean(isAtMaxItems);
            
            return (
              <TradeItemCard
                key={item.uid || index}
                item={item}
                selected={selected}
                disabled={disabled}
                showRemove={showRemoveButtons && selected}
                onClick={() => !disabled && onItemClick?.(item)}
                onRemove={() => onItemRemove?.(item)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}