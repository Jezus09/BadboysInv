/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { CS2ItemType, CS2TeamValues } from "@ianlucas/cs2-lib";
import { useNavigate } from "react-router";
import { useApplyItemSticker } from "~/components/hooks/use-apply-item-sticker";
import { useInspectItem } from "~/components/hooks/use-inspect-item";
import { useRenameItem } from "~/components/hooks/use-rename-item";
import { useScrapeItemSticker } from "~/components/hooks/use-scrape-item-sticker";
import { useStorageUnit } from "~/components/hooks/use-storage-unit";
import { useSwapItemsStatTrak } from "~/components/hooks/use-swap-items-stattrak";
import { useSync } from "~/components/hooks/use-sync";
import { useUnlockCase } from "~/components/hooks/use-unlock-case";
import { InventoryItem } from "~/components/inventory-item";
import { SyncAction } from "~/data/sync";
import { playSound } from "~/utils/sound";
import {
  useInventory,
  useInventoryFilter,
  useInventoryItems,
  usePreferences,
  useTranslate,
  useUser
} from "./app-context";
import { ApplyItemPatch } from "./apply-item-patch";
import { ApplyItemSticker } from "./apply-item-sticker";
import { ApplyItemSticker3D } from "./apply-item-sticker-3d";
import { useApplyItemPatch } from "./hooks/use-apply-item-patch";
import { useListenAppEvent } from "./hooks/use-listen-app-event";
import { useRemoveItemPatch } from "./hooks/use-remove-item-patch";
import { InfoIcon } from "./info-icon";
import { InspectItem } from "./inspect-item";
import { InventoryGridPlaceholder } from "./inventory-grid-placeholder";
import { InventorySelectedItem } from "./inventory-selected-item";
import { useItemSelector } from "./item-selector-context";
import { ModalButton } from "./modal-button";
import { RemoveItemPatch } from "./remove-item-patch";
import { RenameItem } from "./rename-item";
import { RenameStorageUnit } from "./rename-storage-unit";
import { ScrapeItemSticker } from "./scrape-item-sticker";
import { SellItemMarketplace } from "./sell-item-marketplace";
import { SwapItemsStatTrak } from "./swap-items-stattrak";
import { UnlockCase } from "./unlock-case";

export function Inventory() {
  const translate = useTranslate();
  const user = useUser();
  
  // Ha nincs bejelentkezett user, jelenítsd meg a bejelentkezési üzenetet
  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-20">
        <div className="bg-stone-800/95 backdrop-blur-sm rounded-sm p-8 max-w-md mx-4 border border-stone-700 shadow-2xl">
          <h2 className="font-display text-2xl font-bold text-white mb-4 [font-stretch:62.5%] uppercase text-center">
            Bejelentkezés szükséges
          </h2>
          <p className="text-neutral-300 mb-6 leading-relaxed text-center">
            Jelentkezz be Steam-mel a skin-ek megtekintéséhez és a leltár használatához.
          </p>
          <div className="flex justify-center">
            <ModalButton
              onClick={() => window.location.href = "/sign-in"}
              variant="primary"
              className="inline-flex items-center gap-2"
            >
              <i className="fab fa-steam"></i>
              Bejelentkezés Steam-mel
            </ModalButton>
          </div>
        </div>
      </div>
    );
  }
  
  const sync = useSync();
  const items = useInventoryItems();
  const { filterItems } = useInventoryFilter();
  const { hideFilters } = usePreferences();
  const [inventory, setInventory] = useInventory();
  const [itemSelector, setItemSelector] = useItemSelector();
  const navigate = useNavigate();
  const [marketplaceListingUids, setMarketplaceListingUids] = useState<Set<number>>(new Set());

  const ownApplicableStickers =
    items.filter(({ item }) => item.isSticker()).length > 0 &&
    items.filter(({ item }) => item.hasStickers()).length > 0;

  const ownApplicablePatches =
    items.filter(({ item }) => item.isPatch()).length > 0 &&
    items.filter(({ item }) => item.hasPatches()).length > 0;

  const {
    closeUnlockCase,
    handleUnlockCase,
    handleUnlockCaseEvent,
    handleUnlockCaseSelect,
    isUnlockingCase,
    unlockCase,
    unlockCaseKey
  } = useUnlockCase();

  const {
    closeRenameItem,
    handleRenameItem,
    handleRenameItemSelect,
    isRenamingItem,
    renameItem
  } = useRenameItem();

  const {
    closeRenameStorageUnit,
    handleDepositToStorageUnit,
    handleDepositToStorageUnitSelect,
    handleInspectStorageUnit,
    handleRenameStorageUnit,
    handleRetrieveFromStorageUnit,
    handleRetrieveFromStorageUnitSelect,
    isRenamingStorageUnit,
    renameStorageUnit
  } = useStorageUnit();

  const {
    applyItemPatch,
    closeApplyItemPatch,
    handleApplyItemPatch,
    handleApplyItemPatchSelect,
    isApplyingItemPatch
  } = useApplyItemPatch();

  const {
    closeRemoveItemPatch,
    handleRemoveItemPatch,
    isRemovingItemPatch,
    removeItemPatch
  } = useRemoveItemPatch();

  const {
    applyItemSticker,
    closeApplyItemSticker,
    handleApplyItemSticker,
    handleApplyItemStickerSelect,
    isApplyingItemSticker
  } = useApplyItemSticker();

  const {
    closeScrapeItemSticker,
    handleScrapeItemSticker,
    isScrapingItemSticker,
    scrapeItemSticker
  } = useScrapeItemSticker();

  const {
    closeSwapItemsStatTrak,
    handleSwapItemsStatTrak,
    handleSwapItemsStatTrakSelect,
    isSwapingItemsStatTrak,
    swapItemsStatTrak
  } = useSwapItemsStatTrak();

  const { closeInspectItem, handleInspectItem, inspectItem, isInspectingItem } =
    useInspectItem();

  const [sellMarketplaceItem, setSellMarketplaceItem] = useState<typeof items[0] | null>(null);
  const [applyItemSticker3D, setApplyItemSticker3D] = useState<{
    targetUid: number;
    stickerUid: number;
  } | null>(null);

  // Helper to trigger plugin inventory sync
  async function triggerPluginInventorySync(steamId: string) {
    try {
      // Get the current timestamp
      const timestamp = Math.floor(Date.now() / 1000);

      // Update the inventory last update time in the database
      await fetch(`/api/inventory-timestamp/${steamId}`, {
        method: "POST",
      });

      console.log("Sending refresh request for SteamID:", steamId);
      const response = await fetch("http://cs2badboys.ggwp.cc:5005/api/refresh-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          SteamId: steamId,
          LastUpdateTimestamp: timestamp
        })
      });
      console.log("Refresh response:", response.status);
    } catch (e) {
      console.error("Failed to refresh inventory:", e);
    }
  }

  // Load marketplace listings to show badges
  useEffect(() => {
    async function loadMarketplaceListings() {
      try {
        const response = await fetch("/api/marketplace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_my_listings" })
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.listings)) {
          const uids = new Set(data.listings.map((listing: any) => listing.itemUid));
          setMarketplaceListingUids(uids);
        }
      } catch (e) {
        console.error("Failed to load marketplace listings:", e);
      }
    }

    if (user) {
      loadMarketplaceListings();
    }
  }, [user]);

  function handleEquip(uid: number, team?: CS2TeamValues) {
    playSound(
      inventory.get(uid).type === CS2ItemType.MusicKit
        ? "music_equip"
        : "inventory_item_pickup"
    );
    setInventory(inventory.equip(uid, team));
    sync({ type: SyncAction.Equip, uid: uid, team });
    
    // Send refresh request to plugin if user is logged in
    if (user?.id) {
      triggerPluginInventorySync(user.id);
    }
  }

  function handleUnequip(uid: number, team?: CS2TeamValues) {
    playSound("inventory_item_close");
    setInventory(inventory.unequip(uid, team));
    sync({ type: SyncAction.Unequip, uid: uid, team });
  }

  function handleRemove(uid: number) {
    playSound("inventory_item_close");
    setInventory(inventory.remove(uid));
    sync({ type: SyncAction.Remove, uid: uid });
  }

  function handleEdit(uid: number) {
    return navigate(`/craft?uid=${uid}`);
  }

  function handleSellMarketplace(uid: number) {
    const item = items.find((i) => i.uid === uid);
    if (item) {
      setSellMarketplaceItem(item);
    }
  }

  function closeSellMarketplace() {
    setSellMarketplaceItem(null);
  }

  function dismissSelectItem() {
    setItemSelector(undefined);
    closeApplyItemPatch();
    closeApplyItemSticker();
    closeInspectItem();
    closeRemoveItemPatch();
    closeRenameItem();
    closeRenameStorageUnit();
    closeScrapeItemSticker();
    closeSellMarketplace();
    closeSwapItemsStatTrak();
    closeUnlockCase();
  }

  function handleSelectItem(uid: number) {
    if (itemSelector !== undefined) {
      const { type } = itemSelector;

      switch (type) {
        case "unlock-case":
          setItemSelector(undefined);
          return handleUnlockCaseSelect(uid);
        case "swap-items-stattrak":
          setItemSelector(undefined);
          return handleSwapItemsStatTrakSelect(uid);
        case "rename-item":
          setItemSelector(undefined);
          return handleRenameItemSelect(uid);
        case "apply-item-patch":
          setItemSelector(undefined);
          return handleApplyItemPatchSelect(uid);
        case "apply-item-sticker":
          setItemSelector(undefined);
          return handleApplyItemStickerSelect(uid);
        case "deposit-to-storage-unit":
          return handleDepositToStorageUnitSelect(uid);
        case "retrieve-from-storage-unit":
          return handleRetrieveFromStorageUnitSelect(uid);
      }
    }
  }

  useListenAppEvent("unlockcase", handleUnlockCaseEvent);

  const isSelectingAnItem = itemSelector !== undefined;
  const displayedItems = isSelectingAnItem
    ? itemSelector.items
    : hideFilters
      ? items
      : items.filter(filterItems);

  return (
    <>
      {isSelectingAnItem && (
        <InventorySelectedItem
          {...itemSelector}
          onDismiss={dismissSelectItem}
        />
      )}
      <div className="m-auto grid w-full [grid-template-columns:repeat(auto-fit,minmax(154px,1fr))] px-2 select-none [grid-gap:1em] lg:my-8 lg:w-[1024px] lg:px-0">
        {displayedItems.map((item) => (
          <div key={item.uid} className="flex items-start justify-center">
            <InventoryItem
              {...item}
              isOnMarketplace={marketplaceListingUids.has(item.uid)}
              {...(isSelectingAnItem
                ? {
                    disableContextMenu: true,
                    onClick: itemSelector?.readOnly
                      ? undefined
                      : handleSelectItem
                  }
                : {
                    onApplyPatch: handleApplyItemPatch,
                    onApplySticker: handleApplyItemSticker,
                    onApplySticker3D: (targetUid: number, stickerUid: number) => {
                      setApplyItemSticker3D({ targetUid, stickerUid });
                    },
                    onDepositToStorageUnit: handleDepositToStorageUnit,
                    onEdit: handleEdit,
                    onEquip: handleEquip,
                    onInspectItem: handleInspectItem,
                    onInspectStorageUnit: handleInspectStorageUnit,
                    onRemove: handleRemove,
                    onRemovePatch: handleRemoveItemPatch,
                    onRename: handleRenameItem,
                    onRenameStorageUnit: handleRenameStorageUnit,
                    onRetrieveFromStorageUnit: handleRetrieveFromStorageUnit,
                    onScrapeSticker: handleScrapeItemSticker,
                    onSellMarketplace: handleSellMarketplace,
                    onSwapItemsStatTrak: handleSwapItemsStatTrak,
                    onUnequip: handleUnequip,
                    onUnlockContainer: handleUnlockCase,
                    ownApplicablePatches,
                    ownApplicableStickers
                  })}
            />
          </div>
        ))}
        <InventoryGridPlaceholder />
      </div>
      {displayedItems.length === 0 && (
        <div className="m-auto flex justify-center select-none lg:w-[1024px]">
          <div className="flex w-full items-center justify-center gap-2 bg-linear-to-r from-transparent via-black/30 to-transparent py-1">
            <InfoIcon className="h-4" />
            {translate("InventoryNoItemsToDisplay")}
          </div>
        </div>
      )}
      {isUnlockingCase(unlockCase) && (
        <UnlockCase
          {...unlockCase}
          key={unlockCaseKey}
          onClose={closeUnlockCase}
        />
      )}
      {isRenamingItem(renameItem) && (
        <RenameItem {...renameItem} onClose={closeRenameItem} />
      )}
      {isRenamingStorageUnit(renameStorageUnit) && (
        <RenameStorageUnit
          {...renameStorageUnit}
          onClose={closeRenameStorageUnit}
        />
      )}
      {isApplyingItemPatch(applyItemPatch) && (
        <ApplyItemPatch {...applyItemPatch} onClose={closeApplyItemPatch} />
      )}
      {isRemovingItemPatch(removeItemPatch) && (
        <RemoveItemPatch {...removeItemPatch} onClose={closeRemoveItemPatch} />
      )}
      {isApplyingItemSticker(applyItemSticker) && (
        <ApplyItemSticker
          {...applyItemSticker}
          onClose={closeApplyItemSticker}
        />
      )}
      {applyItemSticker3D && (
        <ApplyItemSticker3D
          {...applyItemSticker3D}
          onClose={() => setApplyItemSticker3D(null)}
        />
      )}
      {isScrapingItemSticker(scrapeItemSticker) && (
        <ScrapeItemSticker
          {...scrapeItemSticker}
          onClose={closeScrapeItemSticker}
        />
      )}
      {isSwapingItemsStatTrak(swapItemsStatTrak) && (
        <SwapItemsStatTrak
          {...swapItemsStatTrak}
          onClose={closeSwapItemsStatTrak}
        />
      )}
      {isInspectingItem(inspectItem) && (
        <InspectItem {...inspectItem} onClose={closeInspectItem} />
      )}
      {sellMarketplaceItem && sellMarketplaceItem.item && (
        <SellItemMarketplace
          item={sellMarketplaceItem.item}
          onClose={closeSellMarketplace}
        />
      )}
    </>
  );
}
