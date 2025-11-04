/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { useState } from "react";
import { createPortal } from "react-dom";
import { ClientOnly } from "remix-utils/client-only";
import { useInventoryItem } from "~/components/hooks/use-inventory-item";
import { useNameItemString } from "~/components/hooks/use-name-item";
import { useSync } from "~/components/hooks/use-sync";
import { SyncAction } from "~/data/sync";
import { playSound } from "~/utils/sound";
import { useInventory, useTranslate } from "./app-context";
import { ItemImage } from "./item-image";
import { ModalButton } from "./modal-button";
import { Overlay } from "./overlay";
import { UseItemFooter } from "./use-item-footer";
import { UseItemHeader } from "./use-item-header";

export function ApplyItemKeychain({
  onClose,
  targetUid,
  keychainUid
}: {
  onClose: () => void;
  targetUid: number;
  keychainUid: number;
}) {
  const [inventory, setInventory] = useInventory();
  const translate = useTranslate();
  const sync = useSync();
  const nameItemString = useNameItemString();

  const [slot, setSlot] = useState<number>();
  const keychainItem = useInventoryItem(keychainUid);
  const targetItem = useInventoryItem(targetUid);

  function handleApplyKeychain() {
    if (slot !== undefined) {
      // Get the keychain item to access its properties
      const keychain = inventory.get(keychainUid);
      const target = inventory.get(targetUid);

      // Build the new keychains map
      const newKeychains: Record<number, { id: number; seed?: number; x?: number; y?: number }> = {};

      // Copy existing keychains
      target.allKeychains().forEach(([existingSlot, existingKeychain]) => {
        if (existingKeychain !== undefined) {
          newKeychains[existingSlot] = existingKeychain;
        }
      });

      // Add the new keychain at the selected slot
      newKeychains[slot] = {
        id: keychain.id,
        seed: Math.floor(Math.random() * 100000) // Random seed for variation
      };

      sync({
        type: SyncAction.ApplyItemKeychain,
        keychainUid,
        slot,
        targetUid
      });

      // Use edit() to apply the keychain since there's no applyItemKeychain method
      setInventory(
        inventory
          .edit(targetUid, { keychains: newKeychains })
          .remove(keychainUid)
      );

      playSound("inventory_new_item_accept");
      onClose();
    }
  }

  return (
    <ClientOnly
      children={() =>
        createPortal(
          <Overlay>
            <UseItemHeader
              actionDesc={translate("ApplyStickerUseOn")}
              actionItem={nameItemString(targetItem)}
              title={translate("ApplyKeychainUse")}
              warning={translate("ApplyKeychainWarn")}
            />
            <ItemImage className="m-auto max-w-[512px]" item={targetItem} />
            <div className="flex items-center justify-center">
              {targetItem.allKeychains().map(([xslot, keychain]) =>
                keychain !== undefined || xslot === slot ? (
                  <ItemImage
                    key={xslot}
                    className="w-[168px]"
                    item={
                      keychain !== undefined
                        ? CS2Economy.getById(keychain.id)
                        : keychainItem
                    }
                  />
                ) : (
                  <button
                    key={xslot}
                    className="group flex h-[126px] w-[168px] items-center justify-center"
                    onClick={() => {
                      setSlot(xslot);
                      playSound("buttonclick");
                    }}
                  >
                    <div className="rounded-md border-2 border-white/20 p-4 px-6 transition group-hover:border-white/80">
                      <FontAwesomeIcon className="h-4" icon={faPlus} />
                    </div>
                  </button>
                )
              )}
            </div>
            <UseItemFooter
              right={
                <>
                  <ModalButton
                    children={translate("ApplyKeychainUse")}
                    disabled={slot === undefined}
                    onClick={handleApplyKeychain}
                    variant="primary"
                  />
                  <ModalButton
                    children={translate("ApplyStickerCancel")}
                    onClick={onClose}
                    variant="secondary"
                  />
                </>
              }
            />
          </Overlay>,
          document.body
        )
      }
    />
  );
}
