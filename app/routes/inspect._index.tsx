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

  // TODO: Dynamic skin loading based on defIndex + paintKitId
  // For now, test with AK-47 Asiimov (paint kit ID = 524)
  let skinPatternUrl = undefined;
  const paintKitIdNum = parseInt(paintKitId);

  if (defIndex === 7 && paintKitIdNum === 524) {
    // AK-47 Asiimov - Use BAKED texture (pre-composited)
    skinPatternUrl = "/models/ak47/ak47_asiimov_baked.png";
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
  const { defIndex, itemName, paintKitId, paintSeed, wear, skinPatternUrl } = useLoaderData<typeof loader>();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="absolute left-4 top-4 z-10 rounded-lg bg-black/50 p-4 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">{itemName}</h1>
        <div className="mt-2 space-y-1 text-sm text-gray-300">
          <div>Def Index: {defIndex}</div>
          <div>Paint Kit: {paintKitId === 0 ? "None (Vanilla)" : paintKitId}</div>
          <div>Paint Seed: {paintSeed}</div>
          <div>Wear: {wear.toFixed(4)}</div>
          <div>Skin: {skinPatternUrl ? "✅ Loaded" : "❌ Not loaded"}</div>
        </div>
      </div>

      <ClientOnly fallback={<div className="flex h-full items-center justify-center text-white">Loading 3D viewer...</div>}>
        {() => <Scene3D defIndex={defIndex} paintSeed={paintSeed} wear={wear} skinTextureUrl={skinPatternUrl} />}
      </ClientOnly>
    </div>
  );
}
