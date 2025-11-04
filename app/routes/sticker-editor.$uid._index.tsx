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

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);
  const formData = await request.formData();
  const action = formData.get("action");

  try {
    if (action === "save_stickers") {
      // TODO: Save to database
      return data({ success: true });
    }
    return data({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return data({ success: false, error: String(error) }, { status: 500 });
  }
}

export default function StickerEditor() {
  const { uid } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [inventory] = useInventory();

  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [stickers, setStickers] = useState<Record<number, { id: number; x: number; y: number; rotation: number; scale: number }>>({});
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const weaponImageRef = useRef<HTMLDivElement>(null);

  // Safely find weapon item
  const weaponItem = inventory?.items?.find((item) => item.uid === uid);

  if (!weaponItem) {
    return (
      <div className="min-h-screen bg-stone-800 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Weapon not found</p>
        </div>
      </div>
    );
  }

  const economyItem = CS2Economy.getById(weaponItem.id);
  const ownedStickers = inventory?.items?.filter((item) => {
    try {
      return CS2Economy.getById(item.id).type === CS2ItemType.Sticker;
    } catch {
      return false;
    }
  }) || [];

  const handleStickerClick = (stickerId: number) => {
    if (editingSlot !== null) {
      setStickers({
        ...stickers,
        [editingSlot]: { id: stickerId, x: 0.5, y: 0.5, rotation: 0, scale: 1.0 },
      });
      setEditingSlot(null);
    }
  };

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
    setStickers({ ...stickers, [draggingSlot]: { ...stickers[draggingSlot], x, y } });
  };

  const handleRemoveSticker = (slot: number) => {
    const updated = { ...stickers };
    delete updated[slot];
    setStickers(updated);
    if (editingSlot === slot) setEditingSlot(null);
  };

  return (
    <div className="min-h-screen bg-stone-800 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-display">{economyItem.name}</h1>
          {weaponItem.wear !== undefined && (
            <p className="text-sm text-neutral-400 mt-1">
              Float: {weaponItem.wear.toFixed(4)}
              {weaponItem.seed && <> | Seed: {weaponItem.seed}</>}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar: Your Stickers */}
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
            <h2 className="text-lg font-bold mb-3">Your Stickers</h2>
            {editingSlot !== null && (
              <p className="text-xs text-blue-400 mb-3">📍 Select sticker for Slot {editingSlot + 1}</p>
            )}
            {editingSlot === null && (
              <p className="text-xs text-neutral-500 mb-3">Click a slot below first</p>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {ownedStickers.map((item) => {
                const stickerEconomy = CS2Economy.getById(item.id);
                return (
                  <button
                    key={item.uid}
                    onClick={() => handleStickerClick(item.id)}
                    disabled={editingSlot === null}
                    className="p-2 rounded border-2 border-stone-700 hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition aspect-square bg-stone-800"
                  >
                    <ItemImage className="w-full h-full" item={stickerEconomy} />
                  </button>
                );
              })}
            </div>
            {ownedStickers.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-8">No stickers owned</p>
            )}
          </div>

          {/* Main: Weapon & Editor */}
          <div className="space-y-4">
            {/* Weapon with stickers overlay */}
            <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-6">
              <div
                ref={weaponImageRef}
                className="relative max-w-2xl mx-auto select-none"
                onMouseMove={handleWeaponMouseMove}
                onMouseUp={() => setDraggingSlot(null)}
                onMouseLeave={() => setDraggingSlot(null)}
              >
                <ItemImage className="w-full pointer-events-none" item={economyItem} />

                {/* Stickers overlay */}
                {Object.entries(stickers).map(([slotStr, sticker]) => {
                  const slot = parseInt(slotStr);
                  const stickerEconomy = CS2Economy.getById(sticker.id);
                  return (
                    <div
                      key={slot}
                      className={`absolute cursor-move ${editingSlot === slot ? "ring-2 ring-blue-500" : ""}`}
                      style={{
                        left: `${sticker.x * 100}%`,
                        top: `${sticker.y * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                        width: "64px",
                        height: "64px",
                      }}
                      onMouseDown={(e) => handleStickerMouseDown(slot, e)}
                    >
                      <ItemImage className="w-full h-full" item={stickerEconomy} />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-center text-neutral-500 mt-2">
                💡 Drag stickers to position
              </p>
            </div>

            {/* Slot selector */}
            <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
              <h3 className="text-base font-bold mb-3">Sticker Slots (5 max)</h3>
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((slot) => {
                  const sticker = stickers[slot];
                  const isEditing = editingSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setEditingSlot(slot)}
                      className={`aspect-square rounded border-2 transition ${
                        isEditing ? "border-blue-500 bg-blue-500/20" : "border-stone-700 bg-stone-800"
                      }`}
                    >
                      {sticker ? (
                        <ItemImage className="w-full p-2" item={CS2Economy.getById(sticker.id)} />
                      ) : (
                        <span className="text-neutral-500 text-sm">{slot + 1}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            {editingSlot !== null && stickers[editingSlot] && (
              <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
                <h3 className="text-base font-bold mb-3">Slot {editingSlot + 1} Controls</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm">Rotation: {stickers[editingSlot].rotation}°</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={stickers[editingSlot].rotation}
                      onChange={(e) =>
                        setStickers({
                          ...stickers,
                          [editingSlot]: { ...stickers[editingSlot], rotation: parseInt(e.target.value) },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm">Scale: {stickers[editingSlot].scale.toFixed(1)}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={stickers[editingSlot].scale}
                      onChange={(e) =>
                        setStickers({
                          ...stickers,
                          [editingSlot]: { ...stickers[editingSlot], scale: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveSticker(editingSlot)}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 rounded"
                  >
                    Remove Sticker
                  </button>
                </div>
              </div>
            )}

            {/* Save */}
            <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
              <Form method="post">
                <input type="hidden" name="action" value="save_stickers" />
                <input type="hidden" name="stickers" value={JSON.stringify(stickers)} />
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold"
                  disabled={Object.keys(stickers).length === 0}
                >
                  Save ({Object.keys(stickers).length}/5)
                </button>
              </Form>
              {actionData?.success && (
                <p className="text-green-400 text-sm mt-2">✓ Saved!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
