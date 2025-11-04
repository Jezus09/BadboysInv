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
    <div className="flex flex-col h-full bg-stone-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-stone-700">
        <h2 className="text-lg lg:text-xl font-bold mb-3 font-display">Sticker Browser</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="Search stickers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition text-sm"
        />

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition"
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
            className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition"
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
        <div className="text-xs text-neutral-400 mt-2">
          {fetcher.state === "loading" ? (
            "Loading stickers..."
          ) : (
            `${filteredStickers.length} of ${fetcher.data?.total || 0} stickers`
          )}
        </div>
      </div>

      {/* Sticker Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {fetcher.state === "loading" ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredStickers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No stickers found
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => onSelectSticker(sticker)}
                className={`
                  relative p-2 rounded-lg border-2 transition-all
                  hover:scale-[1.02] active:scale-[0.98]
                  ${
                    selectedStickerId === sticker.id
                      ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                      : "border-stone-700 bg-stone-800/50 hover:border-stone-600 hover:bg-stone-800"
                  }
                `}
                title={sticker.name}
              >
                {/* Sticker Image */}
                <div className="aspect-square mb-1.5 flex items-center justify-center bg-stone-900/50 rounded">
                  <img
                    src={sticker.image}
                    alt={sticker.name}
                    className="max-w-full max-h-full object-contain p-1"
                    loading="lazy"
                  />
                </div>

                {/* Sticker Name */}
                <div className="text-[10px] lg:text-xs font-medium truncate">
                  {sticker.name.replace("Sticker | ", "")}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {/* Rarity Badge */}
                  {sticker.rarity && (
                    <div
                      className="text-[9px] px-1.5 py-0.5 rounded-full inline-block"
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
                    <div className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 inline-block">
                      {sticker.effect}
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                {selectedStickerId === sticker.id && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg
                      className="w-3 h-3 text-white"
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
