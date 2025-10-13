/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { CS2Inventory } from "@ianlucas/cs2-lib";
import { requireUser } from "~/auth.server";
import {
  getShopItems,
  getShopItem,
  getShopItemsByCategory
} from "~/models/shop.server";
import { subtractCoins } from "~/models/currency.server";
import {
  getUserInventory,
  manipulateUserInventory
} from "~/models/user.server";
import { parseInventory } from "~/utils/inventory";
import {
  inventoryMaxItems,
  inventoryStorageUnitMaxItems
} from "~/models/rule.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  try {
    const items = category
      ? await getShopItemsByCategory(category)
      : await getShopItems();

    return data({
      success: true,
      items: items.map((item) => ({
        ...item,
        price: item.price.toString() // Convert Decimal to string for JSON
      }))
    });
  } catch (error) {
    console.error("Shop items fetch error:", error);
    return data({ success: false, items: [] });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const action = String(formData.get("action"));
  const shopItemId = String(formData.get("shopItemId"));
  const quantity = parseInt(String(formData.get("quantity") || "1"));

  if (action === "purchase") {
    if (!shopItemId) {
      return data(
        { success: false, message: "Shop item ID is required" },
        { status: 400 }
      );
    }

    try {
      // For multiple quantity, just deduct total cost
      const shopItem = await getShopItem(shopItemId);
      if (!shopItem) {
        return data(
          { success: false, message: "Shop item not found" },
          { status: 404 }
        );
      }

      const totalCost = shopItem.price.mul(quantity);

      // Deduct total cost from user
      const result = await subtractCoins(user.id, totalCost);

      if (result.success) {
        return data({
          success: true,
          message: `Successfully purchased ${quantity}x ${shopItem.name}`,
          newBalance: result.coins ? result.coins.toFixed(2) : "0.00"
        });
      } else {
        return data({
          success: false,
          message: result.error || "Insufficient funds"
        });
      }
    } catch (error) {
      console.error("Purchase error:", error);
      return data(
        {
          success: false,
          message: "Purchase failed"
        },
        { status: 500 }
      );
    }
  }

  return data({ success: false, message: "Invalid action" }, { status: 400 });
}
