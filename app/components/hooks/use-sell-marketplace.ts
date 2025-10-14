/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { useInventory } from "~/components/app-context";

export function useSellMarketplace() {
  const [inventory] = useInventory();
  const [sellItem, setSellItem] = useState<{
    uid: number;
  }>();

  function isSelling(value: typeof sellItem) {
    return value !== undefined;
  }

  function handleSellMarketplace(uid: number) {
    setSellItem({
      uid
    });
  }

  function closeSellMarketplace() {
    setSellItem(undefined);
  }

  return {
    sellItem: sellItem !== undefined
      ? {
          ...sellItem,
          item: inventory.get(sellItem.uid)
        }
      : undefined,
    isSelling,
    handleSellMarketplace,
    closeSellMarketplace
  };
}
