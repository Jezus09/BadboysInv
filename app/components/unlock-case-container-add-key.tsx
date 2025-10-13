/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert, CS2EconomyItem } from "@ianlucas/cs2-lib";
import { useToggle } from "@uidotdev/usehooks";
import { useState } from "react";
import { useNavigate } from "react-router";
import { dispatchAppEvent } from "~/app";
import { SyncAction } from "~/data/sync";
import { toArrayIf } from "~/utils/misc";
import { range } from "~/utils/number";
import { useInventory, useRules, useTranslate, useUser } from "./app-context";
import { useSync } from "./hooks/use-sync";
import { Modal, ModalHeader } from "./modal";
import { ModalButton } from "./modal-button";
import { Select } from "./select";

const KEY_MAX_QUANTITY = 20;

export function UnlockCaseContainerAddKey({
  caseUid,
  neededKeyItem
}: {
  caseUid: number;
  neededKeyItem: CS2EconomyItem;
}) {
  const translate = useTranslate();
  const sync = useSync();
  const user = useUser();
  const [inventory, setInventory] = useInventory();
  const { craftMaxQuantity, inventoryMaxItems } = useRules();
  const [amount, setAmount] = useState("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, toggleConfirmModal] = useToggle(false);
  const [purchaseInfo, setPurchaseInfo] = useState<{
    keyShopItem: any;
    totalCost: number;
    quantity: number;
  } | null>(null);

  const maxQuantity = Math.min(
    inventoryMaxItems - inventory.size(),
    KEY_MAX_QUANTITY,
    ...toArrayIf(craftMaxQuantity, (n) => n > 0)
  );

  async function handleAddClick() {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const quantity = parseInt(amount);

      // First, get all key shop items to find the matching one
      const response = await fetch("/api/shop?category=key");
      const shopData = await response.json();

      if (!shopData.success) {
        alert("Nem sikerült betölteni a kulcsokat a shop-ból.");
        return;
      }

      // Find a key shop item that matches the needed key itemId
      const matchingKeyShopItem = shopData.items.find(
        (item: any) => item.itemId === neededKeyItem.id
      );

      if (!matchingKeyShopItem) {
        alert(
          `Nem található kulcs a shop-ban ehhez a ládához: ${neededKeyItem.name}`
        );
        return;
      }

      const keyPrice = parseFloat(matchingKeyShopItem.price);
      const totalCost = keyPrice * quantity;

      // Check if user has enough coins
      const userBalance = user ? parseFloat((user as any).coins || "0") : 0;
      if (userBalance < totalCost) {
        alert(
          `Nincs elég pénzed! Szükséges: $${totalCost.toFixed(2)}, van: $${userBalance.toFixed(2)}`
        );
        return;
      }

      // Set purchase info and show confirmation
      setPurchaseInfo({
        keyShopItem: matchingKeyShopItem,
        totalCost,
        quantity
      });
      toggleConfirmModal();
    } catch (error) {
      console.error("Purchase preparation error:", error);
      alert("Hiba történt a vásárlás előkészítése során.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleConfirmPurchase() {
    if (!purchaseInfo) return;

    setIsProcessing(true);
    try {
      // Purchase keys from shop
      const purchaseResponse = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "purchase",
          shopItemId: purchaseInfo.keyShopItem.id,
          quantity: purchaseInfo.quantity.toString()
        })
      });

      const result = await purchaseResponse.json();

      if (result.success) {
        // Close confirmation modal
        toggleConfirmModal();

        // Add keys to inventory
        const inventoryItem = { id: neededKeyItem.id };
        range(purchaseInfo.quantity).forEach(() => {
          setInventory(inventory.add(inventoryItem));
          sync({
            type: SyncAction.AddFromShop,
            item: inventoryItem
          });
        });

        // Find the first key and unlock case
        const firstKey = inventory
          .getAll()
          .find((item) => item.id === neededKeyItem.id);
        if (firstKey !== undefined) {
          dispatchAppEvent("unlockcase", {
            caseUid,
            keyUid: firstKey.uid
          });
        }
      } else {
        alert(result.message || "A vásárlás sikertelen volt.");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Hiba történt a vásárlás során.");
    } finally {
      setIsProcessing(false);
      setPurchaseInfo(null);
    }
  }

  function handleCancelPurchase() {
    toggleConfirmModal();
    setPurchaseInfo(null);
  }

  return maxQuantity === 0 ? null : (
    <div className="mr-2 flex items-center gap-2 border-r border-r-white/10 pr-4">
      <Select
        direction="up"
        value={amount}
        onChange={setAmount}
        options={range(maxQuantity).map((n) => ({
          value: (n + 1).toString()
        }))}
        noMaxHeight
        className="min-w-[64px]"
        optionsStyles="max-h-[256px] overflow-y-scroll"
      />
      <ModalButton
        children={isProcessing ? "Betöltés..." : translate("CaseAdd")}
        variant="primary"
        onClick={handleAddClick}
        disabled={isProcessing}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && purchaseInfo && (
        <Modal className="w-[420px]" fixed>
          <ModalHeader
            title="Kulcs vásárlás megerősítése"
            onClose={handleCancelPurchase}
          />
          <div className="px-4 py-2">
            <div className="text-center">
              <h3 className="mb-4 text-lg font-bold text-white">
                {purchaseInfo.quantity}x {neededKeyItem.name}
              </h3>
              <p className="mb-4 text-neutral-300">
                Összeg:{" "}
                <span className="font-bold text-yellow-400">
                  ${purchaseInfo.totalCost.toFixed(2)}
                </span>
              </p>
              <p className="mb-6 text-sm text-neutral-400">
                Biztosan meg szeretnéd vásárolni ezeket a kulcsokat?
              </p>
            </div>
          </div>
          <div className="my-6 flex justify-center gap-2">
            <ModalButton
              children="Mégse"
              onClick={handleCancelPurchase}
              variant="secondary"
              disabled={isProcessing}
            />
            <ModalButton
              children={isProcessing ? "Vásárlás..." : "Vásárlás"}
              onClick={handleConfirmPurchase}
              variant="primary"
              disabled={isProcessing}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
