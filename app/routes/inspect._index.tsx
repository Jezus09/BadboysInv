import { useState } from "react";
import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { ClientOnly } from "remix-utils/client-only";
import { Scene3D } from "~/components/Scene3D";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const itemId = url.searchParams.get("id");
  const paintKitId = url.searchParams.get("paintkit") || url.searchParams.get("paint") || "0";
  const paintSeed = url.searchParams.get("seed") || "0";
  const wear = url.searchParams.get("wear") || "0";

  // Default to AK-47 if no ID provided
  const defIndex = itemId ? parseInt(itemId) : 7; // 7 = AK-47

  const item = CS2Economy.getById(defIndex);

  // Dynamic skin loading based on defIndex + paintKitId
  let skinPatternUrl = undefined;
  const paintKitIdNum = parseInt(paintKitId);

  // AK-47 (defIndex = 7) skin patterns
  if (defIndex === 7) {
    const skinMap: Record<number, string> = {
      524: "/textures/skins/asiimov_pattern.png",      // Asiimov
      180: "/textures/skins/fireserpent_pattern.png",  // Fire Serpent
      // TODO: Add more skins here as we export them
    };

    skinPatternUrl = skinMap[paintKitIdNum];
  }

  return {
    defIndex,
    itemName: item?.name || "Unknown",
    paintKitId: paintKitIdNum,
    paintSeed: parseInt(paintSeed),
    wear: parseFloat(wear),
    skinPatternUrl,
  };
}

export default function InspectPage() {
  const loaderData = useLoaderData<typeof loader>();

  // Interactive state
  const [currentWear, setCurrentWear] = useState(loaderData.wear);
  const [currentPaintKit, setCurrentPaintKit] = useState(loaderData.paintKitId);

  // Mobile console debug (Eruda)
  if (typeof window !== 'undefined' && !window.eruda) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/eruda';
    script.onload = () => (window as any).eruda.init();
    document.head.appendChild(script);
  }

  // Available skins (for testing)
  const availableSkins = [
    { id: 0, name: "Vanilla (No Skin)", url: undefined },
    { id: 524, name: "Asiimov", url: "/textures/skins/asiimov_pattern.png" },
    { id: 180, name: "Fire Serpent", url: "/textures/skins/fireserpent_pattern.png" },
    // TODO: Add more skins here
  ];

  const currentSkin = availableSkins.find(s => s.id === currentPaintKit) || availableSkins[0];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Info Panel */}
      <div className="absolute left-4 top-4 z-10 rounded-lg bg-black/50 p-4 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">{loaderData.itemName}</h1>
        <div className="mt-2 space-y-1 text-sm text-gray-300">
          <div>Def Index: {loaderData.defIndex}</div>
          <div>Paint Kit: {currentPaintKit === 0 ? "None (Vanilla)" : currentPaintKit}</div>
          <div>Paint Seed: {loaderData.paintSeed}</div>
          <div>Wear: {currentWear.toFixed(4)}</div>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="absolute right-4 top-4 z-10 w-80 rounded-lg bg-black/50 p-4 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-white mb-4">Controls</h2>

        {/* Skin Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Skin
          </label>
          <select
            value={currentPaintKit}
            onChange={(e) => setCurrentPaintKit(parseInt(e.target.value))}
            className="w-full rounded bg-gray-800 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {availableSkins.map(skin => (
              <option key={skin.id} value={skin.id}>
                {skin.name}
              </option>
            ))}
          </select>
        </div>

        {/* Wear Slider */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Wear: {currentWear.toFixed(4)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentWear}
            onChange={(e) => setCurrentWear(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Factory New (0.00)</span>
            <span>Battle-Scarred (1.00)</span>
          </div>
        </div>

        {/* Pattern Seed Info */}
        <div className="text-xs text-gray-400 mt-4">
          <p>💡 Pattern seed changes coming soon!</p>
          <p className="mt-1">Current seed: {loaderData.paintSeed}</p>
        </div>
      </div>

      <ClientOnly fallback={<div className="flex h-full items-center justify-center text-white">Loading 3D viewer...</div>}>
        {() => <Scene3D defIndex={loaderData.defIndex} paintSeed={loaderData.paintSeed} wear={currentWear} skinPatternUrl={currentSkin.url} />}
      </ClientOnly>
    </div>
  );
}
