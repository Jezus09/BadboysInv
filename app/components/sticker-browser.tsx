import { useState, useEffect } from "react";
import { useFetcher } from "react-router";

interface Sticker {
  id: string;
  name: string;
  description?: string;
  rarity?: {
    id: string;
    name: string;
    color: string;
  };
  type?: string;
  effect?: string;
  tournament?: {
    id: number;
    name: string;
  };
  image: string;
}

interface StickerBrowserProps {
  onSelectSticker: (sticker: Sticker) => void;
  selectedStickerId?: string | null;
}

export default function StickerBrowser({
  onSelectSticker,
  selectedStickerId,
}: StickerBrowserProps) {
  const fetcher = useFetcher<{
    success: boolean;
    stickers: Sticker[];
    count: number;
    total: number;
  }>();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [effectFilter, setEffectFilter] = useState<string>("");

  // Load stickers on mount
  useEffect(() => {
    fetcher.load("/api/stickers");
  }, []);

  // Filter stickers locally
  const filteredStickers = fetcher.data?.stickers.filter((sticker) => {
    const matchesSearch = !searchQuery ||
      sticker.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || sticker.type === typeFilter;
    const matchesEffect = !effectFilter || sticker.effect === effectFilter;

    return matchesSearch && matchesType && matchesEffect;
  }) || [];

  // Get unique types and effects for filters
  const availableTypes = Array.from(
    new Set(fetcher.data?.stickers.map((s) => s.type).filter(Boolean))
  ).sort();

  const availableEffects = Array.from(
    new Set(fetcher.data?.stickers.map((s) => s.effect).filter(Boolean))
  ).sort();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold mb-4">Sticker Browser</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="Search stickers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Types</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={effectFilter}
            onChange={(e) => setEffectFilter(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Effects</option>
            {availableEffects.map((effect) => (
              <option key={effect} value={effect}>
                {effect}
              </option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-400 mt-2">
          {fetcher.state === "loading" ? (
            "Loading stickers..."
          ) : (
            `Showing ${filteredStickers.length} of ${fetcher.data?.total || 0} stickers`
          )}
        </div>
      </div>

      {/* Sticker Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {fetcher.state === "loading" ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredStickers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No stickers found
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => onSelectSticker(sticker)}
                className={`
                  relative p-3 rounded-lg border-2 transition-all
                  hover:scale-105 hover:shadow-lg
                  ${
                    selectedStickerId === sticker.id
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-gray-700 bg-gray-800 hover:border-gray-600"
                  }
                `}
                title={sticker.name}
              >
                {/* Sticker Image */}
                <div className="aspect-square mb-2 flex items-center justify-center">
                  <img
                    src={sticker.image}
                    alt={sticker.name}
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Sticker Name */}
                <div className="text-xs font-medium truncate">
                  {sticker.name.replace("Sticker | ", "")}
                </div>

                {/* Rarity Badge */}
                {sticker.rarity && (
                  <div
                    className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
                    style={{
                      backgroundColor: `${sticker.rarity.color}20`,
                      color: sticker.rarity.color,
                    }}
                  >
                    {sticker.rarity.name}
                  </div>
                )}

                {/* Effect Badge */}
                {sticker.effect && sticker.effect !== "Other" && (
                  <div className="text-xs mt-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 inline-block ml-1">
                    {sticker.effect}
                  </div>
                )}

                {/* Selection Indicator */}
                {selectedStickerId === sticker.id && (
                  <div className="absolute top-1 right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
