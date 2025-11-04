/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { createPortal } from "react-dom";
import { ClientOnly } from "remix-utils/client-only";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { useInventoryItem } from "~/components/hooks/use-inventory-item";
import { useNameItemString } from "~/components/hooks/use-name-item";
import { useSync } from "~/components/hooks/use-sync";
import { SyncAction } from "~/data/sync";
import { playSound } from "~/utils/sound";
import { useInventory } from "./app-context";
import { ItemImage } from "./item-image";
import { ModalButton } from "./modal-button";
import { Overlay } from "./overlay";
import { UseItemFooter } from "./use-item-footer";
import { WeaponViewer3D } from "./weapon-viewer-3d";

export function ApplyItemSticker3D({
  onClose,
  targetUid,
  stickerUid,
  onSwitchTo2D
}: {
  onClose: () => void;
  targetUid: number;
  stickerUid: number;
  onSwitchTo2D?: () => void;
}) {
  const [inventory, setInventory] = useInventory();
  const sync = useSync();
  const nameItemString = useNameItemString();

  const [selectedSlot, setSelectedSlot] = useState<number>();
  const [stickerPosition, setStickerPosition] = useState({ x: 0, y: 0, z: 0.01 });
  const [stickerRotation, setStickerRotation] = useState(0);
  const [stickerScale, setStickerScale] = useState(1.0);
  const [placementMode, setPlacementMode] = useState<"manual" | "click">("click");

  const stickerItem = useInventoryItem(stickerUid);
  const targetItem = useInventoryItem(targetUid);

  function handleSurfaceClick(position: [number, number, number], surfaceName: string) {
    if (selectedSlot === undefined) return;

    // Update sticker position to clicked location
    setStickerPosition({ x: position[0], y: position[1], z: position[2] });
    playSound("sticker_apply");
  }

  function handleApplySticker() {
    if (selectedSlot !== undefined) {
      if (targetUid >= 0) {
        sync({
          type: SyncAction.ApplyItemSticker,
          targetUid,
          slot: selectedSlot,
          stickerUid,
          // 3D transform data
          x: stickerPosition.x,
          y: stickerPosition.y,
          rotation: stickerRotation
        });
        setInventory(
          inventory.applyItemSticker(
            targetUid,
            stickerUid,
            selectedSlot,
            stickerPosition.x,
            stickerPosition.y,
            stickerRotation
          )
        );
        playSound("sticker_apply_confirm");
        onClose();
      } else {
        sync({
          type: SyncAction.AddWithSticker,
          stickerUid,
          itemId: targetItem.id,
          slot: selectedSlot
        });
        setInventory(inventory.addWithSticker(stickerUid, targetItem.id, selectedSlot));
        playSound("sticker_apply_confirm");
        onClose();
      }
    }
  }

  return (
    <ClientOnly
      children={() =>
        createPortal(
          <Overlay className="m-auto lg:w-[1200px]">
            {/* Header */}
            <div className="mb-4 border-b border-neutral-700 pb-4">
              <h2 className="font-display text-center text-2xl font-bold text-white">
                Apply Sticker - 3D Mode (Beta)
              </h2>
              <p className="mt-1 text-center text-sm text-neutral-400">
                Position your sticker anywhere on the weapon
              </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Left: 3D Viewer */}
              <div className="lg:col-span-2">
                {/* Placement Mode Toggle */}
                <div className="mb-2 flex gap-2">
                  <button
                    onClick={() => setPlacementMode("click")}
                    className={`flex-1 rounded px-3 py-2 text-sm font-bold transition-colors ${
                      placementMode === "click"
                        ? "bg-purple-600 text-white"
                        : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                    }`}
                  >
                    🖱️ Click to Place
                  </button>
                  <button
                    onClick={() => setPlacementMode("manual")}
                    className={`flex-1 rounded px-3 py-2 text-sm font-bold transition-colors ${
                      placementMode === "manual"
                        ? "bg-purple-600 text-white"
                        : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                    }`}
                  >
                    🎚️ Manual Adjust
                  </button>
                </div>

                <div className="aspect-video w-full overflow-hidden rounded-lg border border-neutral-700">
                  <WeaponViewer3D
                    weaponId={targetItem.id}
                    className="h-full w-full"
                    enableClickToPlace={placementMode === "click" && selectedSlot !== undefined}
                    onSurfaceClick={handleSurfaceClick}
                    stickers={
                      selectedSlot !== undefined
                        ? [
                            {
                              id: stickerItem.id,
                              slot: selectedSlot,
                              position: [stickerPosition.x, stickerPosition.y, stickerPosition.z],
                              rotation: stickerRotation,
                              scale: stickerScale
                            }
                          ]
                        : []
                    }
                  />
                </div>

                {/* Sticker Controls */}
                <div className="mt-4 rounded-lg border border-neutral-700 bg-black/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase text-neutral-300">
                      Sticker Transform
                    </h3>
                    {selectedSlot === undefined && (
                      <p className="text-xs text-yellow-400">Select a slot first →</p>
                    )}
                  </div>

                  {/* Position X */}
                  {placementMode === "manual" && (
                    <>
                      <div className="mb-3">
                        <label className="mb-1 block text-xs text-neutral-400">
                          Position X: {stickerPosition.x.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="-1"
                          max="1"
                          step="0.01"
                          value={stickerPosition.x}
                          onChange={(e) =>
                            setStickerPosition({ ...stickerPosition, x: parseFloat(e.target.value) })
                          }
                          className="w-full"
                          disabled={selectedSlot === undefined}
                        />
                      </div>

                      {/* Position Y */}
                      <div className="mb-3">
                        <label className="mb-1 block text-xs text-neutral-400">
                          Position Y: {stickerPosition.y.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="-1"
                          max="1"
                          step="0.01"
                          value={stickerPosition.y}
                          onChange={(e) =>
                            setStickerPosition({ ...stickerPosition, y: parseFloat(e.target.value) })
                          }
                          className="w-full"
                          disabled={selectedSlot === undefined}
                        />
                      </div>
                    </>
                  )}

                  {placementMode === "click" && (
                    <div className="mb-3 rounded border border-purple-500/30 bg-purple-900/20 p-3">
                      <p className="text-xs text-purple-200">
                        <strong>💡 Tip:</strong> Click anywhere on the weapon surface to position your sticker!
                      </p>
                      <p className="mt-2 text-[10px] text-neutral-400">
                        Current position: X:{stickerPosition.x.toFixed(2)} Y:{stickerPosition.y.toFixed(2)} Z:
                        {stickerPosition.z.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Rotation */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs text-neutral-400">
                      Rotation: {stickerRotation}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={stickerRotation}
                      onChange={(e) => setStickerRotation(parseInt(e.target.value))}
                      className="w-full"
                      disabled={selectedSlot === undefined}
                    />
                  </div>

                  {/* Scale */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs text-neutral-400">
                      Scale: {stickerScale.toFixed(2)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={stickerScale}
                      onChange={(e) => setStickerScale(parseFloat(e.target.value))}
                      className="w-full"
                      disabled={selectedSlot === undefined}
                    />
                  </div>

                  <button
                    onClick={() => {
                      setStickerPosition({ x: 0, y: 0, z: 0.01 });
                      setStickerRotation(0);
                      setStickerScale(1.0);
                    }}
                    className="w-full rounded bg-neutral-700 py-2 text-sm font-bold text-white hover:bg-neutral-600"
                  >
                    Reset Transform
                  </button>
                </div>
              </div>

              {/* Right: Sticker Info & Slot Selection */}
              <div className="space-y-4">
                {/* Target Weapon */}
                <div className="rounded-lg border border-neutral-700 bg-black/30 p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase text-neutral-400">
                    Target Weapon
                  </h3>
                  <ItemImage className="mx-auto w-32" item={targetItem} />
                  <p className="mt-2 text-center text-sm font-bold text-white">
                    {nameItemString(targetItem)}
                  </p>
                </div>

                {/* Sticker to Apply */}
                <div className="rounded-lg border border-purple-500/30 bg-purple-900/20 p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase text-purple-300">
                    Sticker to Apply
                  </h3>
                  <ItemImage className="mx-auto w-32" item={stickerItem} />
                  <p className="mt-2 text-center text-sm font-bold text-white">
                    {nameItemString(stickerItem)}
                  </p>
                </div>

                {/* Slot Selection */}
                <div className="rounded-lg border border-neutral-700 bg-black/30 p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase text-neutral-400">
                    Select Slot (1-4)
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((slot) => {
                      const existingSticker = targetItem.stickers?.[slot];
                      const isSelected = selectedSlot === slot;

                      return (
                        <button
                          key={slot}
                          onClick={() => {
                            if (!existingSticker) {
                              setSelectedSlot(slot);
                              playSound("sticker_apply");
                            }
                          }}
                          disabled={!!existingSticker}
                          className={`aspect-square rounded border-2 p-2 transition-all ${
                            isSelected
                              ? "border-purple-500 bg-purple-900/50"
                              : existingSticker
                                ? "border-red-500/30 bg-red-900/20 cursor-not-allowed"
                                : "border-neutral-600 bg-neutral-800 hover:border-purple-400"
                          }`}
                        >
                          {existingSticker ? (
                            <ItemImage
                              className="w-full opacity-50"
                              item={CS2Economy.getById(existingSticker.id)}
                            />
                          ) : (
                            <span className="block text-center text-2xl font-bold text-neutral-500">
                              {slot + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedSlot === undefined && (
                    <p className="mt-2 text-center text-xs text-yellow-400">
                      Select an empty slot to continue
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <UseItemFooter
              left={
                onSwitchTo2D !== undefined ? (
                  <ModalButton
                    onClick={onSwitchTo2D}
                    variant="secondary"
                  >
                    📋 Switch to 2D Mode
                  </ModalButton>
                ) : undefined
              }
              right={
                <>
                  <ModalButton
                    onClick={handleApplySticker}
                    disabled={selectedSlot === undefined}
                    variant="primary"
                  >
                    Apply Sticker
                  </ModalButton>
                  <ModalButton onClick={onClose} variant="secondary">
                    Cancel
                  </ModalButton>
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
