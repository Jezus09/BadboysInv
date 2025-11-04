import { useState, useEffect } from "react";
import { data, useLoaderData, useActionData, Form } from "react-router";
import StickerBrowser from "~/components/sticker-browser";
import { requireUser } from "~/auth.server";
import { getWeaponInstance, addWeaponSticker, removeWeaponSticker } from "~/models/sticker.server";
import type { Route } from "./+types/sticker-editor._index";

// Example weapon model URL (replace with actual weapon model)
const WEAPON_MODEL_URL = "https://models.readyplayer.me/64f1a5e1e5f4a0001a0e1a5e.glb"; // Placeholder

// Client-side only flag
const isClient = typeof window !== "undefined";

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

  return data({ user, weaponInstance, modelUrl: WEAPON_MODEL_URL });
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
      const positionX = parseFloat(formData.get("positionX") as string);
      const positionY = parseFloat(formData.get("positionY") as string);
      const positionZ = parseFloat(formData.get("positionZ") as string);
      const rotationX = parseFloat(formData.get("rotationX") as string) || 0;
      const rotationY = parseFloat(formData.get("rotationY") as string) || 0;
      const rotationZ = parseFloat(formData.get("rotationZ") as string) || 0;
      const scale = parseFloat(formData.get("scale") as string) || 1.0;

      const weaponSticker = await addWeaponSticker({
        weaponId,
        stickerId,
        slot,
        positionX,
        positionY,
        positionZ,
        rotationX,
        rotationY,
        rotationZ,
        scale,
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
  const { user, weaponInstance, modelUrl } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [selectedSticker, setSelectedSticker] = useState<any>(null);
  const [stickers, setStickers] = useState<any[]>([]);
  const [nextSlot, setNextSlot] = useState(1);
  const [showStickerBrowser, setShowStickerBrowser] = useState(false);

  const handleRemoveSticker = (slot: number) => {
    setStickers(stickers.filter((s) => s.slot !== slot));
  };

  return (
    <div className="min-h-screen bg-stone-800 text-white">
      {/* Mobile Sticker Browser Overlay */}
      {showStickerBrowser && (
        <div className="fixed inset-0 z-50 bg-black/80 lg:hidden">
          <div className="flex h-full flex-col bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-700 p-4">
              <h2 className="text-xl font-bold">Select Sticker</h2>
              <button
                onClick={() => setShowStickerBrowser(false)}
                className="rounded-lg bg-stone-700 px-4 py-2 hover:bg-stone-600 transition"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <StickerBrowser
                onSelectSticker={(sticker) => {
                  setSelectedSticker(sticker);
                  setShowStickerBrowser(false);
                }}
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
              onSelectSticker={setSelectedSticker}
              selectedStickerId={selectedSticker?.id}
            />
          </div>
        </div>

        {/* Right Panel: 3D Viewer + Controls */}
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
              >
                Browse Stickers
              </button>
            </div>
          </div>

          {/* 3D Viewer */}
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm overflow-hidden">
            <div className="relative aspect-video lg:aspect-[16/10] bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
              <div className="text-center max-w-lg px-6">
                <div className="text-5xl lg:text-6xl mb-4">🎨</div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2 font-display">3D Weapon Viewer</h2>
                <p className="text-neutral-400 text-sm lg:text-base mb-4">
                  Interactive 3D weapon customization is coming soon!
                </p>
                <p className="text-xs lg:text-sm text-neutral-500">
                  Current weapon: <span className="text-white font-medium">{weaponInstance.weaponName}</span>
                </p>
                {selectedSticker && (
                  <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/40 rounded-lg backdrop-blur-sm">
                    <p className="text-xs lg:text-sm text-blue-300 mb-2">Selected sticker:</p>
                    <div className="flex items-center justify-center gap-3">
                      <img src={selectedSticker.image} alt={selectedSticker.name} className="w-10 h-10 lg:w-12 lg:h-12" />
                      <p className="font-medium text-sm lg:text-base">{selectedSticker.name.replace("Sticker | ", "")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Applied Stickers Panel */}
          <div className="rounded-lg border border-stone-700 bg-stone-900/50 backdrop-blur-sm p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-semibold font-display">
                Applied Stickers ({stickers.length}/5)
              </h3>
              {stickers.length > 0 && (
                <button
                  onClick={() => {
                    setStickers([]);
                    setNextSlot(1);
                  }}
                  className="px-3 py-1.5 lg:px-4 lg:py-2 bg-red-600/90 hover:bg-red-600 rounded-lg text-xs lg:text-sm font-medium transition"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Sticker List */}
            {stickers.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <p className="text-sm">No stickers applied yet</p>
                <p className="text-xs mt-1">Select a sticker from the browser to get started</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stickers.map((sticker) => (
                  <div
                    key={sticker.slot}
                    className="flex items-center justify-between bg-stone-800/50 p-3 rounded-lg hover:bg-stone-800 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-stone-900 rounded flex items-center justify-center border border-stone-700">
                        <img
                          src={sticker.imageUrl}
                          alt={`Slot ${sticker.slot}`}
                          className="max-w-full max-h-full"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm lg:text-base">Slot {sticker.slot}</p>
                        <p className="text-xs text-neutral-400">
                          Scale: {sticker.scale.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSticker(sticker.slot)}
                      className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 rounded text-xs lg:text-sm transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Save Button */}
            <Form method="post" className="mt-4">
              <input type="hidden" name="action" value="save_stickers" />
              <input type="hidden" name="weaponId" value={weaponInstance.id} />
              <input type="hidden" name="stickers" value={JSON.stringify(stickers)} />
              <button
                type="submit"
                disabled={stickers.length === 0}
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
