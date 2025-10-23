/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { z } from "zod";
import { requireUser } from "~/auth.server";
import { prisma } from "~/db.server";
import {
  createTrade,
  getTrade,
  getUserTrades,
  updateTradeStatus,
  acceptTrade,
  searchUsers,
  TradeItem
} from "~/models/trade.server";
import { acceptTradeWithUuid } from "~/models/trade-uuid.server";
import { parseInventory } from "~/utils/inventory";

const tradeItemSchema = z.object({
  uid: z.number().optional(), // Legacy UID support
  uuid: z.string().optional(), // New UUID support
  id: z.number(),
  stickers: z.record(z.any()).optional(),
  wear: z.number().optional(),
  seed: z.number().optional(),
  nameTag: z.string().optional()
}).refine(data => data.uid !== undefined || data.uuid !== undefined, {
  message: "Either uid or uuid must be provided"
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const tradeId = url.searchParams.get("tradeId");
  const searchQuery = url.searchParams.get("search");

  try {
    switch (action) {
      case "list":
        const trades = await getUserTrades(user.id);
        return data({ success: true, trades });

      case "get":
        if (!tradeId) {
          return data(
            { success: false, message: "Trade ID required" },
            { status: 400 }
          );
        }
        const trade = await getTrade(tradeId);
        if (!trade) {
          return data(
            { success: false, message: "Trade not found" },
            { status: 404 }
          );
        }
        // Check if user is part of this trade
        if (
          trade.senderUserId !== user.id &&
          trade.receiverUserId !== user.id
        ) {
          return data(
            { success: false, message: "Access denied" },
            { status: 403 }
          );
        }
        return data({ success: true, trade });

      case "search-users":
        if (!searchQuery || searchQuery.length < 2) {
          return data(
            { success: false, message: "Search query too short" },
            { status: 400 }
          );
        }
        const users = await searchUsers(searchQuery, user.id);
        return data({ success: true, users });

      case "get-user-inventory":
        const targetUserId = url.searchParams.get("userId");
        if (!targetUserId) {
          return data(
            { success: false, message: "User ID required" },
            { status: 400 }
          );
        }

        console.log("Trade API - Getting inventory for user:", targetUserId);

        const targetUser = await prisma.user.findFirst({
          where: { id: targetUserId }
        });

        if (!targetUser) {
          return data(
            { success: false, message: "User not found" },
            { status: 404 }
          );
        }

        const inventoryString = targetUser.inventory;
        console.log(
          "Trade API - Raw inventory string:",
          inventoryString?.substring(0, 200) + "..."
        );

        // Use the official parseInventory function that matches the main app
        const parsedInventoryData = parseInventory(inventoryString);
        console.log(
          "Trade API - Parsed inventory data:",
          parsedInventoryData ? "valid" : "invalid"
        );

        let inventory: any[] = [];

        if (parsedInventoryData && parsedInventoryData.items) {
          // Convert the official inventory format to array for trade UI
          // Support both UUID (new) and UID (legacy) formats
          inventory = Object.entries(parsedInventoryData.items).map(
            ([key, item]: [string, any], index: number) => ({
              ...item,
              // Prefer UUID from item, or use key if it's UUID format, or fallback to UID
              uuid: item.uuid || (key.includes('-') ? key : undefined),
              uid: item.uid || (key.includes('-') ? undefined : parseInt(key)) || index + 1000
            })
          );
          console.log(
            "Trade API - Using official inventory format, items count:",
            inventory.length
          );
        } else {
          console.log("Trade API - No valid inventory data found");
        }

        return data({
          success: true,
          user: {
            id: targetUser.id,
            name: targetUser.name,
            avatar: targetUser.avatar
          },
          inventory
        });

      default:
        return data(
          { success: false, message: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Trade loader error:", error);
    return data(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);

  try {
    const formData = await request.formData();
    const action = formData.get("action");

    console.log("Trade action received:", action);
    console.log("Form data keys:", Array.from(formData.keys()));

    if (!action) {
      return data(
        { success: false, message: "No action specified" },
        { status: 400 }
      );
    }

    switch (String(action)) {
      case "create": {
        const receiverUserId = String(formData.get("receiverUserId"));
        const senderItemsJson = String(formData.get("senderItems"));
        const receiverItemsJson = String(formData.get("receiverItems") || "[]");
        const message = formData.get("message")
          ? String(formData.get("message"))
          : undefined;

        if (!receiverUserId || !senderItemsJson) {
          return data(
            { success: false, message: "Missing required fields" },
            { status: 400 }
          );
        }

        const senderItems = JSON.parse(senderItemsJson);
        const receiverItems = JSON.parse(receiverItemsJson);

        // Validate items
        const validatedSenderItems = z
          .array(tradeItemSchema)
          .parse(senderItems);
        const validatedReceiverItems = z
          .array(tradeItemSchema)
          .parse(receiverItems);

        const trade = await createTrade({
          senderUserId: user.id,
          receiverUserId,
          senderItems: validatedSenderItems,
          receiverItems: validatedReceiverItems,
          message
        });

        return data({
          success: true,
          trade,
          message: "Trade created successfully"
        });
      }

      case "accept": {
        const tradeId = String(formData.get("tradeId"));
        if (!tradeId) {
          return data(
            { success: false, message: "Trade ID required" },
            { status: 400 }
          );
        }

        const trade = await getTrade(tradeId);
        if (!trade) {
          return data(
            { success: false, message: "Trade not found" },
            { status: 404 }
          );
        }

        // Only receiver can accept
        if (trade.receiverUserId !== user.id) {
          return data(
            {
              success: false,
              message: "Only the receiver can accept this trade"
            },
            { status: 403 }
          );
        }

        if (trade.status !== "PENDING") {
          return data(
            { success: false, message: "Trade is no longer pending" },
            { status: 400 }
          );
        }

        // Detect if trade uses UUID or UID
        const senderItems = JSON.parse(trade.senderItems);
        const hasUuid = senderItems.length > 0 && senderItems[0].uuid !== undefined;

        if (hasUuid) {
          console.log("[Trade] Using UUID-based trade acceptance");
          await acceptTradeWithUuid(tradeId);
        } else {
          console.log("[Trade] Using legacy UID-based trade acceptance");
          await acceptTrade(tradeId);
        }

        return data({ success: true, message: "Trade accepted successfully" });
      }

      case "decline": {
        const tradeId = String(formData.get("tradeId"));
        if (!tradeId) {
          return data(
            { success: false, message: "Trade ID required" },
            { status: 400 }
          );
        }

        const trade = await getTrade(tradeId);
        if (!trade) {
          return data(
            { success: false, message: "Trade not found" },
            { status: 404 }
          );
        }

        // Only receiver can decline
        if (trade.receiverUserId !== user.id) {
          return data(
            {
              success: false,
              message: "Only the receiver can decline this trade"
            },
            { status: 403 }
          );
        }

        if (trade.status !== "PENDING") {
          return data(
            { success: false, message: "Trade is no longer pending" },
            { status: 400 }
          );
        }

        await updateTradeStatus(tradeId, "DECLINED");
        return data({ success: true, message: "Trade declined" });
      }

      case "cancel": {
        const tradeId = String(formData.get("tradeId"));
        if (!tradeId) {
          return data(
            { success: false, message: "Trade ID required" },
            { status: 400 }
          );
        }

        const trade = await getTrade(tradeId);
        if (!trade) {
          return data(
            { success: false, message: "Trade not found" },
            { status: 404 }
          );
        }

        // Only sender can cancel
        if (trade.senderUserId !== user.id) {
          return data(
            {
              success: false,
              message: "Only the sender can cancel this trade"
            },
            { status: 403 }
          );
        }

        if (trade.status !== "PENDING") {
          return data(
            { success: false, message: "Trade is no longer pending" },
            { status: 400 }
          );
        }

        await updateTradeStatus(tradeId, "CANCELLED");
        return data({ success: true, message: "Trade cancelled" });
      }

      default:
        return data(
          { success: false, message: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Trade action error:", error);
    return data(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
