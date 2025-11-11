import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { ClientOnly } from "remix-utils/client-only";
import { Scene3D } from "~/components/Scene3D";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const itemId = url.searchParams.get("id");
  const paintSeed = url.searchParams.get("seed") || "0";
  const wear = url.searchParams.get("wear") || "0";

  // Default to AK-47 if no ID provided
  const defIndex = itemId ? parseInt(itemId) : 7; // 7 = AK-47

  const item = CS2Economy.getById(defIndex);

  // Use Asiimov pattern texture for composite shader
  // TODO: Add dynamic skin pattern loading based on item paint kit
  const skinPatternUrl = "/models/ak47/asiimov_pattern.png";

  return {
    defIndex,
    itemName: item?.name || "Unknown",
    paintSeed: parseInt(paintSeed),
    wear: parseFloat(wear),
    skinPatternUrl,
  };
}

export default function InspectPage() {
  const { defIndex, itemName, paintSeed, wear, skinPatternUrl } = useLoaderData<typeof loader>();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="absolute left-4 top-4 z-10 rounded-lg bg-black/50 p-4 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">{itemName}</h1>
        <div className="mt-2 space-y-1 text-sm text-gray-300">
          <div>Def Index: {defIndex}</div>
          <div>Paint Seed: {paintSeed}</div>
          <div>Wear: {wear.toFixed(4)}</div>
          <div className="text-xs opacity-50">Pattern: Asiimov</div>
        </div>
      </div>

      <ClientOnly fallback={<div className="flex h-full items-center justify-center text-white">Loading 3D viewer...</div>}>
        {() => <Scene3D defIndex={defIndex} paintSeed={paintSeed} wear={wear} skinTextureUrl={skinPatternUrl} />}
      </ClientOnly>
    </div>
  );
}
