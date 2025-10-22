/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2Inventory, CS2UnlockedItem, CS2Economy } from "@ianlucas/cs2-lib";
import { z } from "zod";
import { api } from "~/api.server";
import { requireUser } from "~/auth.server";
import { prisma } from "~/db.server";
import { middleware } from "~/http.server";
import {
  inventoryItemAllowUnlockContainer,
  inventoryMaxItems,
  inventoryStorageUnitMaxItems
} from "~/models/rule.server";
import {
  updateUserInventory,
  notifyCaseOpeningBroadcast
} from "~/models/user.server";
import { conflict, methodNotAllowed } from "~/responses.server";
import { parseInventory } from "~/utils/inventory";
import { nonNegativeInt, positiveInt } from "~/utils/shapes";
import type { Route } from "./+types/api.action.unlock-case._index";

export const ApiActionUnlockCaseUrl = "/api/action/unlock-case";

export type ApiActionUnlockCaseActionData = {
  syncedAt: number;
  unlockedItem: CS2UnlockedItem;
};

// Mystery Case ID (Community Case 33)
const MYSTERY_CASE_ID = 4899;

// Mystery Case rewards with probabilities
const MYSTERY_CASE_REWARDS = [
  { id: 4109, name: "Chroma Case", weight: 15 },
  { id: 4110, name: "Chroma 2 Case", weight: 15 },
  { id: 4152, name: "Gamma Case", weight: 15 },
  { id: 4189, name: "Spectrum Case", weight: 15 },
  { id: 4247, name: "Clutch Case", weight: 10 },
  { id: 4264, name: "Prisma Case", weight: 10 },
  { id: 4293, name: "CS20 Case", weight: 10 },
  { id: 4321, name: "Shattered Web Case", weight: 10 }
];

/**
 * Select a random case from Mystery Case rewards based on weights
 */
function selectMysteryReward(): number {
  const totalWeight = MYSTERY_CASE_REWARDS.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;

  for (const reward of MYSTERY_CASE_REWARDS) {
    random -= reward.weight;
    if (random <= 0) {
      console.log(`[MysteryCase] Selected reward: ${reward.name} (ID: ${reward.id})`);
      return reward.id;
    }
  }

  // Fallback to first reward
  return MYSTERY_CASE_REWARDS[0].id;
}

/**
 * Convert CS2Economy rarity to plugin-expected format
 */
function formatRarityForPlugin(rarity: string): string {
  const rarityMap: Record<string, string> = {
    contraband: "Contraband",
    covert: "Covert",
    classified: "Classified",
    restricted: "Restricted",
    "mil-spec": "Mil-Spec",
    "mil-spec grade": "Mil-Spec",
    "industrial grade": "Industrial",
    industrial: "Industrial",
    "consumer grade": "Consumer",
    consumer: "Consumer"
  };

  return rarityMap[rarity.toLowerCase()] || "Consumer";
}

export const action = api(async ({ request }: Route.ActionArgs) => {
  await middleware(request);
  if (request.method !== "POST") {
    throw methodNotAllowed;
  }
  const user = await requireUser(request);
  const {
    id: userId,
    inventory: rawInventory,
    syncedAt: currentSyncedAt
  } = user;
  await inventoryItemAllowUnlockContainer.for(userId).truthy();
  const { caseUid, keyUid, syncedAt } = z
    .object({
      syncedAt: positiveInt,
      caseUid: nonNegativeInt,
      keyUid: nonNegativeInt.optional()
    })
    .parse(await request.json());
  if (syncedAt !== currentSyncedAt.getTime()) {
    throw conflict;
  }
  const inventory = new CS2Inventory({
    data: parseInventory(rawInventory),
    maxItems: await inventoryMaxItems.for(userId).get(),
    storageUnitMaxItems: await inventoryStorageUnitMaxItems.for(userId).get()
  });

  // Get case and key info before unlocking
  const caseItem = inventory.get(caseUid);
  const keyItem = keyUid !== undefined ? inventory.get(keyUid) : undefined;

  // Check if this is a Mystery Case
  const isMysteryCase = caseItem.id === MYSTERY_CASE_ID;

  let unlockedItem: CS2UnlockedItem;

  if (isMysteryCase) {
    console.log("[MysteryCase] Opening Mystery Case...");

    // Select random case reward
    const rewardCaseId = selectMysteryReward();

    // Remove Mystery Case from inventory
    inventory.removeItem(caseUid);

    // Add reward case to inventory
    inventory.add({ id: rewardCaseId });

    // Create fake unlocked item data for the reward case
    unlockedItem = {
      id: rewardCaseId,
      uid: inventory.maxUid
    } as CS2UnlockedItem;

    console.log(`[MysteryCase] Awarded ${CS2Economy.getById(rewardCaseId).name}`);
  } else {
    // Normal case unlock
    unlockedItem = caseItem.unlockContainer();
    inventory.unlockContainer(unlockedItem, caseUid, keyUid);
  }

  const { syncedAt: responseSyncedAt } = await updateUserInventory(
    userId,
    inventory.stringify()
  );

  // Get item data for webhook and activity feed
  const unlockedItemData = CS2Economy.getById(unlockedItem.id);
  const caseItemData = CS2Economy.getById(caseItem.id);
  const keyItemData = keyItem ? CS2Economy.getById(keyItem.id) : undefined;

  // Notify CS2 plugin about case opening immediately (fire and forget)
  notifyCaseOpeningBroadcast({
    playerName: user.name,
    itemName: unlockedItemData.name,
    rarity: formatRarityForPlugin(unlockedItemData.rarity),
    statTrak: unlockedItem.statTrak !== undefined
  }).catch((error) => {
    console.error("[CaseOpening] Background webhook notification failed:", error);
  });

  // Save case opening to activity feed with delay to match animation timing
  setTimeout(async () => {
    try {
      await prisma.caseOpening.create({
        data: {
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          caseItemId: caseItem.id,
          caseName: caseItemData.name,
          keyItemId: keyItem?.id || null,
          keyName: keyItemData?.name || null,
          unlockedItemId: unlockedItem.id,
          unlockedName: unlockedItemData.name,
          unlockedRarity: unlockedItemData.rarity
        }
      });
    } catch (error) {
      console.error("Error saving case opening:", error);
      // Don't fail the whole request if activity saving fails
    }
  }, 4000); // 4 second delay to match case opening animation

  return Response.json({
    unlockedItem,
    syncedAt: responseSyncedAt.getTime()
  } satisfies ApiActionUnlockCaseActionData);
});

export { loader } from "./api.$";
