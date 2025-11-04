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

  const handleRemoveSticker = (slot: number) => {
    setStickers(stickers.filter((s) => s.slot !== slot));
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Panel: Sticker Browser */}
      <div className="w-1/3 border-r border-gray-700 overflow-hidden">
        <StickerBrowser
          onSelectSticker={setSelectedSticker}
          selectedStickerId={selectedSticker?.id}
        />
      </div>

      {/* Right Panel: 3D Viewer + Controls */}
      <div className="flex-1 flex flex-col">
        {/* Weapon Info */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold">{weaponInstance.weaponName}</h1>
          <p className="text-sm text-gray-400">
            Float: {weaponInstance.wear?.toFixed(4)} | Seed: {weaponInstance.seed}
          </p>
        </div>

        {/* 3D Viewer - Coming Soon */}
        <div className="flex-1 relative bg-gray-800 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-2xl font-bold mb-2">3D Weapon Viewer</h2>
            <p className="text-gray-400 mb-4">
              Interactive 3D weapon customization is coming soon!
            </p>
            <p className="text-sm text-gray-500">
              Current weapon: <span className="text-white font-medium">{weaponInstance.weaponName}</span>
            </p>
            {selectedSticker && (
              <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <p className="text-sm text-blue-300">Selected sticker:</p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <img src={selectedSticker.image} alt={selectedSticker.name} className="w-12 h-12" />
                  <p className="font-medium">{selectedSticker.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Applied Stickers ({stickers.length}/5)
            </h3>
            <button
              onClick={() => {
                setStickers([]);
                setNextSlot(1);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
            >
              Clear All
            </button>
          </div>

          {/* Sticker List */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {stickers.map((sticker) => (
              <div
                key={sticker.slot}
                className="flex items-center justify-between bg-gray-900 p-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center">
                    <img
                      src={sticker.imageUrl}
                      alt={`Slot ${sticker.slot}`}
                      className="max-w-full max-h-full"
                    />
                  </div>
                  <div>
                    <p className="font-medium">Slot {sticker.slot}</p>
                    <p className="text-xs text-gray-400">
                      Scale: {sticker.scale.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveSticker(sticker.slot)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <Form method="post" className="mt-4">
            <input type="hidden" name="action" value="save_stickers" />
            <input type="hidden" name="weaponId" value={weaponInstance.id} />
            <input type="hidden" name="stickers" value={JSON.stringify(stickers)} />
            <button
              type="submit"
              disabled={stickers.length === 0}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              Save Stickers to Weapon
            </button>
          </Form>

          {/* Action Feedback */}
          {actionData && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                actionData.success
                  ? "bg-green-500/20 text-green-300"
                  : "bg-red-500/20 text-red-300"
              }`}
            >
              {actionData.success ? "✓ Stickers saved successfully!" : `✗ ${actionData.error}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
