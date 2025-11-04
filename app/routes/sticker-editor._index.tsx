import { useState } from "react";
import { data, useLoaderData, useActionData, Form } from "react-router";
import { CS2Economy } from "@ianlucas/cs2-lib";
import StickerBrowser from "~/components/sticker-browser";
import { AppliedStickerEditor } from "~/components/applied-sticker-editor";
import { ItemImage } from "~/components/item-image";
import { requireUser } from "~/auth.server";
import { getWeaponInstance, addWeaponSticker, removeWeaponSticker } from "~/models/sticker.server";
import type { Route } from "./+types/sticker-editor._index";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  // For demo purposes, we'll return a mock weapon instance
  // In production, you'd fetch this from the database
  const weaponInstance = {
    id: "weapon-demo-1",
    userId: user.id,
    weaponDefIndex: 7, // AK-47
    weaponName: "AK-47 | Redline",
    weaponId: "weapon_ak47",
    skinId: 282,
    wear: 0.15,
    seed: 661,
    stickers: [],
  };

  return data({ user, weaponInstance });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    if (action === "add_sticker") {
      const weaponId = formData.get("weaponId") as string;
      const stickerId = formData.get("stickerId") as string;
      const slot = parseInt(formData.get("slot") as string, 10);
      const x = parseFloat(formData.get("x") as string) || 0;
      const y = parseFloat(formData.get("y") as string) || 0;
      const rotation = parseFloat(formData.get("rotation") as string) || 0;
      const wear = parseFloat(formData.get("wear") as string) || 0;

      const weaponSticker = await addWeaponSticker({
        weaponId,
        stickerId,
        slot,
        positionX: x,
        positionY: y,
        positionZ: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: rotation,
        scale: 1.0,
      });

      return data({ success: true, weaponSticker });
    }

    if (action === "remove_sticker") {
      const weaponId = formData.get("weaponId") as string;
      const slot = parseInt(formData.get("slot") as string, 10);

      await removeWeaponSticker(weaponId, slot);

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
  const { user, weaponInstance } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [selectedSticker, setSelectedSticker] = useState<any>(null);
  const [showStickerBrowser, setShowStickerBrowser] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  // Sticker state for all 5 slots
  const [stickers, setStickers] = useState<Record<number, {
    id: string;
    x: number;
    y: number;
    rotation: number;
    wear: number;
  }>>({});

  const [stickerAttributes, setStickerAttributes] = useState({
    x: 0,
    y: 0,
    rotation: 0,
    wear: 0,
  });

  // Get weapon item from economy
  // AK-47 weapon ID is 7, but we need to find it in the economy
  const weaponItem = CS2Economy.get((item) => {
    // Try to find by name first
    if (weaponInstance.weaponName) {
      return item.name === weaponInstance.weaponName;
    }
    // Fallback to ID
    return item.id === weaponInstance.weaponDefIndex;
  })?.[0];

  const handleSelectSticker = (sticker: any) => {
    if (editingSlot !== null) {
      setSelectedSticker(sticker);
      setShowStickerBrowser(false);
    }
  };

  const handleApplySticker = () => {
    if (editingSlot !== null && selectedSticker) {
      setStickers({
        ...stickers,
        [editingSlot]: {
          id: selectedSticker.id,
          x: stickerAttributes.x,
          y: stickerAttributes.y,
          rotation: stickerAttributes.rotation,
          wear: stickerAttributes.wear,
        },
      });
      setEditingSlot(null);
      setSelectedSticker(null);
      setStickerAttributes({ x: 0, y: 0, rotation: 0, wear: 0 });
    }
  };

  const handleRemoveSticker = (slot: number) => {
    const updated = { ...stickers };
    delete updated[slot];
    setStickers(updated);
  };

  const handleSlotClick = (slot: number) => {
    if (stickers[slot]) {
      // Edit existing sticker
      const sticker = stickers[slot];
      setSelectedSticker(CS2Economy.getById(parseInt(sticker.id)));
      setStickerAttributes({
        x: sticker.x,
        y: sticker.y,
        rotation: sticker.rotation,
        wear: sticker.wear,
      });
      setEditingSlot(slot);
    } else {
      // Add new sticker
      setEditingSlot(slot);
      setShowStickerBrowser(true);
    }
  };

  const stickerCount = Object.keys(stickers).length;

  return (
    <div className="min-h-screen bg-stone-800 text-white">
      {/* Mobile Sticker Browser Overlay */}
      {showStickerBrowser && (
        <div className="fixed inset-0 z-50 bg-black/80 lg:hidden">
          <div className="flex h-full flex-col bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-700 p-4">
              <h2 className="text-xl font-bold">Select Sticker</h2>
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
            <div className="flex-1 overflow-hidden">
              <StickerBrowser
                onSelectSticker={handleSelectSticker}
                selectedStickerId={selectedSticker?.id}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:flex lg:gap-6">
        {/* Left Panel: Sticker Browser (Desktop Only) */}
        <div className="hidden lg:block lg:w-80 xl:w-96">
          <div className="sticky top-24 rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm overflow-hidden">
            <StickerBrowser
              onSelectSticker={handleSelectSticker}
              selectedStickerId={selectedSticker?.id}
            />
          </div>
        </div>

        {/* Right Panel: Weapon Display + Controls */}
        <div className="flex-1 space-y-4">
          {/* Weapon Info Card */}
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm p-4 lg:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold lg:text-2xl font-display">{weaponInstance.weaponName}</h1>
                <p className="text-sm text-neutral-400 mt-1">
                  Float: <span className="text-white font-mono">{weaponInstance.wear?.toFixed(4)}</span>
                  {" "} | {" "}
                  Seed: <span className="text-white font-mono">{weaponInstance.seed}</span>
                </p>
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

          {/* Weapon Image with Stickers Overlay */}
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm overflow-hidden p-6">
            <div className="relative max-w-[512px] mx-auto">
              {/* Weapon Image Placeholder */}
              <div className="w-full aspect-[512/384] bg-gradient-to-br from-stone-800 to-stone-900 rounded-lg flex items-center justify-center border border-stone-700">
                <div className="text-center">
                  <div className="text-6xl mb-2">🔫</div>
                  <p className="text-xl font-bold">{weaponInstance.weaponName}</p>
                  <p className="text-sm text-neutral-400 mt-1">Weapon preview will show here</p>
                </div>
              </div>

              {/* Sticker Slots */}
              <div className="mt-4 grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((slot) => {
                  const sticker = stickers[slot];
                  const stickerItem = sticker ? CS2Economy.getById(parseInt(sticker.id)) : null;
                  const isEditing = editingSlot === slot;

                  return (
                    <button
                      key={slot}
                      onClick={() => handleSlotClick(slot)}
                      className={`
                        aspect-square rounded-lg border-2 transition-all
                        ${isEditing ? "border-blue-500 bg-blue-500/20" : "border-stone-700 hover:border-stone-600"}
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

              {editingSlot !== null && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-300 mb-2">
                    {stickers[editingSlot] ? `✏️ Editing slot ${editingSlot + 1}` : `➕ Adding sticker to slot ${editingSlot + 1}`}
                  </p>
                  {!selectedSticker && (
                    <p className="text-xs text-neutral-400">
                      Select a sticker from the browser to continue
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sticker Editor (shown when a sticker is selected) */}
          {editingSlot !== null && selectedSticker && (
            <div className="rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm p-4 lg:p-6">
              <h3 className="text-lg font-bold mb-4 font-display">Sticker Position & Attributes</h3>

              <AppliedStickerEditor
                item={selectedSticker}
                value={stickerAttributes}
                onChange={setStickerAttributes}
              />

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleApplySticker}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
                >
                  {stickers[editingSlot] ? "Update Sticker" : "Apply Sticker"}
                </button>
                {stickers[editingSlot] && (
                  <button
                    onClick={() => handleRemoveSticker(editingSlot)}
                    className="px-4 py-2 bg-red-600/90 hover:bg-red-600 rounded-lg font-medium transition"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingSlot(null);
                    setSelectedSticker(null);
                  }}
                  className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg font-medium transition"
                >
                  Cancel
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
              <input type="hidden" name="weaponId" value={weaponInstance.id} />
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
