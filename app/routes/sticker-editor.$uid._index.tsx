import { useState } from "react";
import { data, useLoaderData, Form, redirect } from "react-router";
import { CS2Economy, CS2ItemType } from "@ianlucas/cs2-lib";
import { ClientOnly } from "remix-utils/client-only";
import { ItemImage } from "~/components/item-image";
import { requireUser } from "~/auth.server";
import { useInventory } from "~/components/app-context";
import type { Route } from "./+types/sticker-editor.$uid._index";
import WeaponViewer3DSimple from "~/components/weapon-3d-viewer-simple";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const uid = parseInt(params.uid);

  if (isNaN(uid)) {
    throw redirect("/");
  }

  // We'll use client-side inventory from AppContext instead of fetching here
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

function StickerEditorContent() {
  const { uid } = useLoaderData<typeof loader>();
  const [inventory] = useInventory();
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [stickers, setStickers] = useState<
    Record<
      number,
      {
        id: number;
        imageUrl: string;
        position: [number, number, number];
        rotation: number;
        scale: number;
      }
    >
  >({});

  // Find weapon item
  const weaponItem = inventory?.items?.find((item) => item.uid === uid);

  if (!weaponItem) {
    return (
      <div className="min-h-screen bg-stone-800 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Weapon not found (UID: {uid})</p>
          <a href="/" className="text-blue-400 hover:underline mt-4 block">
            ← Back to inventory
          </a>
        </div>
      </div>
    );
  }

  const economyItem = CS2Economy.getById(weaponItem.id);
  const ownedStickers =
    inventory?.items?.filter((item) => {
      try {
        return CS2Economy.getById(item.id).type === CS2ItemType.Sticker;
      } catch {
        return false;
      }
    }) || [];

  const handleStickerClick = (stickerId: number, imageUrl: string) => {
    if (editingSlot !== null) {
      setStickers({
        ...stickers,
        [editingSlot]: {
          id: stickerId,
          imageUrl,
          position: [0, 0, 0.16], // On front of box
          rotation: 0,
          scale: 0.3,
        },
      });
    }
  };

  const handleRemoveSticker = (slot: number) => {
    const updated = { ...stickers };
    delete updated[slot];
    setStickers(updated);
    if (editingSlot === slot) setEditingSlot(null);
  };

  // Convert stickers to 3D viewer format
  const stickers3D = Object.entries(stickers).map(([slotStr, sticker]) => ({
    id: parseInt(slotStr),
    imageUrl: sticker.imageUrl,
    position: sticker.position,
    rotation: sticker.rotation,
    scale: sticker.scale,
  }));

  return (
    <div className="min-h-screen bg-stone-800 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">3D Sticker Editor</h1>
            <p className="text-sm text-neutral-400 mt-1">{economyItem.name}</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm"
          >
            ← Back
          </a>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar: Your Stickers */}
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
            <h2 className="text-lg font-bold mb-3">Your Stickers</h2>
            {editingSlot !== null && (
              <p className="text-xs text-blue-400 mb-3">
                📍 Select sticker for Slot {editingSlot + 1}
              </p>
            )}
            {editingSlot === null && (
              <p className="text-xs text-neutral-500 mb-3">Click a slot below first</p>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {ownedStickers.map((item) => {
                const stickerEconomy = CS2Economy.getById(item.id);
                const imageUrl = `https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/images/econ/stickers/${stickerEconomy.image}`;

                return (
                  <button
                    key={item.uid}
                    onClick={() => handleStickerClick(item.id, imageUrl)}
                    disabled={editingSlot === null}
                    className="p-2 rounded border-2 border-stone-700 hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition aspect-square bg-stone-800"
                  >
                    <ItemImage className="w-full h-full" item={stickerEconomy} />
                  </button>
                );
              })}
            </div>
            {ownedStickers.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-8">
                No stickers owned
              </p>
            )}
          </div>

          {/* Main: 3D Viewer & Editor */}
          <div className="space-y-4">
            {/* 3D Weapon Viewer */}
            <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-6">
              <div className="h-96 w-full bg-stone-800 rounded">
                <ClientOnly
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-neutral-400">Loading 3D Viewer...</p>
                    </div>
                  }
                >
                  {() => <WeaponViewer3DSimple stickers={stickers3D} />}
                </ClientOnly>
              </div>
              <p className="text-xs text-center text-neutral-500 mt-2">
                🖱️ Drag to rotate | Scroll to zoom
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
                        isEditing
                          ? "border-blue-500 bg-blue-500/20"
                          : "border-stone-700 bg-stone-800"
                      }`}
                    >
                      {sticker ? (
                        <img
                          src={sticker.imageUrl}
                          alt="sticker"
                          className="w-full p-2"
                        />
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
                <h3 className="text-base font-bold mb-3">
                  Slot {editingSlot + 1} Controls
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm">
                      Position X: {stickers[editingSlot].position[0].toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="-1.5"
                      max="1.5"
                      step="0.01"
                      value={stickers[editingSlot].position[0]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setStickers({
                          ...stickers,
                          [editingSlot]: {
                            ...stickers[editingSlot],
                            position: [val, stickers[editingSlot].position[1], stickers[editingSlot].position[2]],
                          },
                        });
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm">
                      Position Y: {stickers[editingSlot].position[1].toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="-0.3"
                      max="0.3"
                      step="0.01"
                      value={stickers[editingSlot].position[1]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setStickers({
                          ...stickers,
                          [editingSlot]: {
                            ...stickers[editingSlot],
                            position: [stickers[editingSlot].position[0], val, stickers[editingSlot].position[2]],
                          },
                        });
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm">
                      Rotation: {stickers[editingSlot].rotation}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={stickers[editingSlot].rotation}
                      onChange={(e) =>
                        setStickers({
                          ...stickers,
                          [editingSlot]: {
                            ...stickers[editingSlot],
                            rotation: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm">
                      Scale: {stickers[editingSlot].scale.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.1"
                      value={stickers[editingSlot].scale}
                      onChange={(e) =>
                        setStickers({
                          ...stickers,
                          [editingSlot]: {
                            ...stickers[editingSlot],
                            scale: parseFloat(e.target.value),
                          },
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
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={Object.keys(stickers).length === 0}
                >
                  Save Stickers ({Object.keys(stickers).length}/5)
                </button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StickerEditor() {
  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-stone-800 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Loading 3D Sticker Editor...</p>
        </div>
      </div>
    }>
      {() => <StickerEditorContent />}
    </ClientOnly>
  );
}
