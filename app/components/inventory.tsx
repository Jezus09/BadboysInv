/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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
import { SwapItemsStatTrak } from "./swap-items-stattrak";
import { UnlockCase } from "./unlock-case";
import { useSellMarketplace } from "./hooks/use-sell-marketplace";
import { SellItemMarketplace } from "./sell-item-marketplace";

export function Inventory() {
  const translate = useTranslate();
  const user = useUser();

  // Ha nincs bejelentkezett user, jelenítsd meg a bejelentkezési üzenetet
  if (!user) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center">
        <div className="mx-4 max-w-md rounded-sm border border-stone-700 bg-stone-800/95 p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="font-display mb-4 text-center text-2xl font-bold text-white uppercase [font-stretch:62.5%]">
            Bejelentkezés szükséges
          </h2>
          <p className="mb-6 text-center leading-relaxed text-neutral-300">
            Jelentkezz be Steam-mel a skin-ek megtekintéséhez és a leltár
            használatához.
          </p>
          <div className="flex justify-center">
            <ModalButton
              onClick={() => (window.location.href = "/sign-in")}
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

  const {
    closeSellMarketplace,
    handleSellMarketplace,
    isSelling,
    sellItem
  } = useSellMarketplace();

  // Helper to trigger plugin inventory sync
  async function triggerPluginInventorySync(steamId: string) {
    try {
      // Helyes plugin endpoint és payload
      const response = await fetch(
        "http://cs2badboys.ggwp.cc:5005/api/plugin/refresh-inventory",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            SteamId: steamId
          })
        }
      );
      console.log("Refresh response:", response.status);
    } catch (e) {
      console.error("Failed to refresh inventory:", e);
    }
  }

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

    // Send refresh request to plugin if user is logged in
    if (user?.id) {
      triggerPluginInventorySync(user.id);
    }
  }

  function handleRemove(uid: number) {
    playSound("inventory_item_close");
    setInventory(inventory.remove(uid));
    sync({ type: SyncAction.Remove, uid: uid });
  }

  function handleEdit(uid: number) {
    return navigate(`/craft?uid=${uid}`);
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
    closeSwapItemsStatTrak();
    closeUnlockCase();
    closeSellMarketplace();
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
                    onSwapItemsStatTrak: handleSwapItemsStatTrak,
                    onUnequip: handleUnequip,
                    onUnlockContainer: handleUnlockCase,
                    onSellMarketplace: handleSellMarketplace,
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
      {isSelling(sellItem) && (
        <SellItemMarketplace {...sellItem} onClose={closeSellMarketplace} />
      )}
    </>
  );
}
