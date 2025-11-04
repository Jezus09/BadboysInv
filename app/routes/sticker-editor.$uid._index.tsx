import { useState, useRef } from "react";
import { data, useLoaderData, useActionData, Form, redirect } from "react-router";
import { CS2Economy, CS2ItemType } from "@ianlucas/cs2-lib";
import { ItemImage } from "~/components/item-image";
import { requireUser } from "~/auth.server";
import { useInventory } from "~/components/app-context";
import type { Route } from "./+types/sticker-editor.$uid._index";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const uid = parseInt(params.uid);

  if (isNaN(uid)) {
    throw redirect("/");
  }

  return data({ user, uid });
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    if (action === "save_stickers") {
      // TODO: Save stickers to database
      return data({ success: true });
    }

    return data({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Sticker editor action error:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      },
      { status: 500 }
    );
  }
}

export default function StickerEditor() {
  const { user, uid } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [inventory] = useInventory();

  // Get weapon from inventory
  const weaponItem = inventory.get(uid);

  const [selectedSticker, setSelectedSticker] = useState<any>(null);
  const [showStickerBrowser, setShowStickerBrowser] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  // Sticker state for all 5 slots with X/Y position (0-1 normalized coordinates)
  const [stickers, setStickers] = useState<Record<number, {
    id: number;
    x: number; // 0 = left, 1 = right
    y: number; // 0 = top, 1 = bottom
    rotation: number; // degrees
    scale: number; // 0.5 - 2.0
  }>>(
    // Load existing stickers from weapon
    weaponItem?.stickers
      ? Object.fromEntries(
          Object.entries(weaponItem.stickers)
            .filter(([_, sticker]) => sticker !== undefined)
            .map(([slot, sticker]) => [
              parseInt(slot),
              {
                id: sticker!.id,
                x: sticker!.x ?? 0.5,
                y: sticker!.y ?? 0.5,
                rotation: sticker!.rotation ?? 0,
                scale: 1.0,
              },
            ])
        )
      : {}
  );

  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const weaponImageRef = useRef<HTMLDivElement>(null);

  if (!weaponItem) {
    return (
      <div className="min-h-screen bg-stone-800 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Weapon not found</p>
          <a href="/" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
            ← Back to inventory
          </a>
        </div>
      </div>
    );
  }

  const economyItem = CS2Economy.getById(weaponItem.id);

  const handleSelectSticker = (inventoryItem: any) => {
    if (editingSlot !== null) {
      // Add sticker at center
      setStickers({
        ...stickers,
        [editingSlot]: {
          id: inventoryItem.id,
          x: 0.5,
          y: 0.5,
          rotation: 0,
          scale: 1.0,
        },
      });
      setSelectedSticker(inventoryItem);
      setShowStickerBrowser(false);
      setEditingSlot(null);
    }
  };

  const handleRemoveSticker = (slot: number) => {
    const updated = { ...stickers };
    delete updated[slot];
    setStickers(updated);
    if (editingSlot === slot) {
      setEditingSlot(null);
      setSelectedSticker(null);
    }
  };

  const handleSlotClick = (slot: number) => {
    if (stickers[slot]) {
      // Select existing sticker
      setEditingSlot(slot);
      const stickerEconomyId = stickers[slot].id;
      setSelectedSticker(CS2Economy.getById(stickerEconomyId));
    } else {
      // Add new sticker
      setEditingSlot(slot);
      setShowStickerBrowser(true);
    }
  };

  // Drag sticker on weapon image
  const handleStickerMouseDown = (slot: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSlot(slot);
    setEditingSlot(slot);
  };

  const handleWeaponMouseMove = (e: React.MouseEvent) => {
    if (draggingSlot === null || !weaponImageRef.current) return;

    const rect = weaponImageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setStickers({
      ...stickers,
      [draggingSlot]: {
        ...stickers[draggingSlot],
        x,
        y,
      },
    });
  };

  const handleWeaponMouseUp = () => {
    setDraggingSlot(null);
  };

  const handleRotationChange = (slot: number, rotation: number) => {
    setStickers({
      ...stickers,
      [slot]: {
        ...stickers[slot],
        rotation,
      },
    });
  };

  const handleScaleChange = (slot: number, scale: number) => {
    setStickers({
      ...stickers,
      [slot]: {
        ...stickers[slot],
        scale,
      },
    });
  };

  const stickerCount = Object.keys(stickers).length;

  return (
    <div className="min-h-screen bg-stone-800 text-white">
      {/* Mobile Owned Stickers Overlay */}
      {showStickerBrowser && (
        <div className="fixed inset-0 z-50 bg-black/80 lg:hidden">
          <div className="flex h-full flex-col bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-700 p-4">
              <div>
                <h2 className="text-xl font-bold">Your Stickers</h2>
                <p className="text-xs text-neutral-400 mt-1">Select from your inventory</p>
              </div>
              <button
                onClick={() => {
                  setShowStickerBrowser(false);
                  setEditingSlot(null);
                }}
                className="rounded-lg bg-stone-700 px-4 py-2 hover:bg-stone-600 transition"
              >
                Cancel
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2">
                {inventory.items
                  .filter((item) => CS2Economy.getById(item.id).type === CS2ItemType.Sticker)
                  .map((item) => {
                    const economyItem = CS2Economy.getById(item.id);
                    const isSelected = selectedSticker?.id === item.id;
                    return (
                      <button
                        key={item.uid}
                        onClick={() => {
                          handleSelectSticker(economyItem);
                        }}
                        className={`
                          relative p-2 rounded-lg border-2 transition-all aspect-square
                          ${isSelected ? "border-blue-500 bg-blue-500/20" : "border-stone-700 bg-stone-800/50"}
                          hover:border-stone-600
                        `}
                        title={economyItem.name}
                      >
                        <ItemImage className="w-full h-full" item={economyItem} />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
              {inventory.items.filter((item) => CS2Economy.getById(item.id).type === CS2ItemType.Sticker).length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                  <p className="text-base">No stickers in inventory</p>
                  <p className="text-sm mt-2">Get stickers from cases!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:flex lg:gap-6">
        {/* Left Panel: Owned Stickers Only (Desktop Only) */}
        <div className="hidden lg:block lg:w-80 xl:w-96">
          <div className="sticky top-24 rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-stone-700">
              <h2 className="text-lg font-bold font-display">Your Stickers</h2>
              <p className="text-xs text-neutral-400 mt-1">Select from your inventory</p>
            </div>
            <div className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {inventory.items
                  .filter((item) => CS2Economy.getById(item.id).type === CS2ItemType.Sticker)
                  .map((item) => {
                    const economyItem = CS2Economy.getById(item.id);
                    const isSelected = selectedSticker?.id === item.id;
                    return (
                      <button
                        key={item.uid}
                        onClick={() => {
                          if (editingSlot !== null) {
                            handleSelectSticker(economyItem);
                          }
                        }}
                        disabled={editingSlot === null}
                        className={`
                          relative p-2 rounded-lg border-2 transition-all aspect-square
                          ${isSelected ? "border-blue-500 bg-blue-500/20" : "border-stone-700 bg-stone-800/50"}
                          ${editingSlot === null ? "opacity-50 cursor-not-allowed" : "hover:border-stone-600 cursor-pointer"}
                        `}
                        title={economyItem.name}
                      >
                        <ItemImage className="w-full h-full" item={economyItem} />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
              {inventory.items.filter((item) => CS2Economy.getById(item.id).type === CS2ItemType.Sticker).length === 0 && (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  <p>No stickers in inventory</p>
                  <p className="text-xs mt-1">Get stickers from cases!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Weapon Display + Controls */}
        <div className="flex-1 space-y-4">
          {/* Weapon Info Card */}
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm p-4 lg:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold lg:text-2xl font-display">{economyItem.name}</h1>
                {weaponItem.wear !== undefined && (
                  <p className="text-sm text-neutral-400 mt-1">
                    Float: <span className="text-white font-mono">{weaponItem.wear.toFixed(4)}</span>
                    {weaponItem.seed && (
                      <>
                        {" "} | {" "}
                        Seed: <span className="text-white font-mono">{weaponItem.seed}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowStickerBrowser(true)}
                className="lg:hidden rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium transition"
                disabled={editingSlot === null}
              >
                {editingSlot !== null ? "Browse Stickers" : "Select a slot first"}
              </button>
            </div>
          </div>

          {/* Weapon Image with Interactive Stickers */}
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm overflow-hidden p-6">
            <div className="relative max-w-[512px] mx-auto">
              {/* Weapon Skin Image */}
              <div
                ref={weaponImageRef}
                className="relative select-none cursor-crosshair"
                onMouseMove={handleWeaponMouseMove}
                onMouseUp={handleWeaponMouseUp}
                onMouseLeave={handleWeaponMouseUp}
              >
                <ItemImage className="w-full pointer-events-none" item={weaponItem} />

                {/* Stickers Overlaid on Weapon */}
                {Object.entries(stickers).map(([slotStr, sticker]) => {
                  const slot = parseInt(slotStr);
                  const stickerItem = CS2Economy.getById(sticker.id);
                  const isEditing = editingSlot === slot;

                  return (
                    <div
                      key={slot}
                      className={`absolute cursor-move transition-all ${isEditing ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-stone-900" : ""}`}
                      style={{
                        left: `${sticker.x * 100}%`,
                        top: `${sticker.y * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                        width: "64px",
                        height: "64px",
                      }}
                      onMouseDown={(e) => handleStickerMouseDown(slot, e)}
                    >
                      <ItemImage className="w-full h-full" item={stickerItem} />
                      {isEditing && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          Slot {slot + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-center text-neutral-500 mt-2">
                💡 Drag stickers to reposition • Click to select
              </p>

              {/* Sticker Slots */}
              <div className="mt-4 grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((slot) => {
                  const sticker = stickers[slot];
                  const stickerItem = sticker ? CS2Economy.getById(sticker.id) : null;
                  const isEditing = editingSlot === slot;

                  return (
                    <button
                      key={slot}
                      onClick={() => handleSlotClick(slot)}
                      className={`
                        aspect-square rounded-lg border-2 transition-all
                        ${isEditing ? "border-blue-500 bg-blue-500/20 scale-105" : "border-stone-700 hover:border-stone-600"}
                        ${stickerItem ? "bg-stone-800/50" : "bg-stone-900"}
                      `}
                    >
                      {stickerItem ? (
                        <ItemImage className="w-full p-2" item={stickerItem} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-neutral-500">
                          {slot + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticker Controls (shown when editing) */}
          {editingSlot !== null && stickers[editingSlot] && (
            <div className="rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm p-4 lg:p-6">
              <h3 className="text-lg font-bold mb-4 font-display">
                Sticker Controls - Slot {editingSlot + 1}
              </h3>

              <div className="space-y-4">
                {/* Rotation */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Rotation: {stickers[editingSlot].rotation}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={stickers[editingSlot].rotation}
                    onChange={(e) => handleRotationChange(editingSlot, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Scale */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Scale: {stickers[editingSlot].scale.toFixed(2)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={stickers[editingSlot].scale}
                    onChange={(e) => handleScaleChange(editingSlot, parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Position Info */}
                <div className="text-xs text-neutral-400">
                  Position: X={stickers[editingSlot].x.toFixed(2)}, Y={stickers[editingSlot].y.toFixed(2)}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => handleRemoveSticker(editingSlot)}
                  className="flex-1 px-4 py-2 bg-red-600/90 hover:bg-red-600 rounded-lg font-medium transition"
                >
                  Remove Sticker
                </button>
                <button
                  onClick={() => {
                    setEditingSlot(null);
                    setSelectedSticker(null);
                  }}
                  className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg font-medium transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-semibold font-display">
                Applied Stickers ({stickerCount}/5)
              </h3>
            </div>

            <Form method="post">
              <input type="hidden" name="action" value="save_stickers" />
              <input type="hidden" name="stickers" value={JSON.stringify(stickers)} />
              <button
                type="submit"
                disabled={stickerCount === 0}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-700 disabled:cursor-not-allowed disabled:text-neutral-500 rounded-lg font-semibold transition text-sm lg:text-base"
              >
                Save Stickers to Weapon
              </button>
            </Form>

            {/* Action Feedback */}
            {actionData && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm ${
                  actionData.success
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {actionData.success ? "✓ Stickers saved successfully!" : `✗ ${actionData.error}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
