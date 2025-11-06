/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * CSGO-API Sticker Metadata Integration
 * Data source: https://github.com/ByMykel/CSGO-API
 */

export interface StickerRarity {
  id: string;
  name: string;
  color: string;
}

export interface StickerTournament {
  id: number;
  name: string;
}

export interface StickerMetadata {
  id: string;                    // "sticker-1"
  name: string;                  // "Sticker | Shooter"
  description: string;
  def_index: string;             // "1" (CS2 economy item ID)
  rarity: StickerRarity;
  crates: string[];
  collections: string[];
  type: string;                  // "Event", "Team", etc.
  market_hash_name: string | null;
  effect: string;                // "Other", "Foil", "Holo", etc.
  tournament?: StickerTournament;
  image: string;                 // Full CDN URL
  original: {
    name: string;
    image_inventory: string;
  };
}

/**
 * In-memory cache for sticker metadata
 * Populated on first fetch, persists for app lifetime
 */
let stickerCache: StickerMetadata[] | null = null;

/**
 * Cache expiry timestamp (24 hours)
 */
let cacheTimestamp: number | null = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * API endpoint for sticker metadata
 */
const STICKER_API_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json";

/**
 * Fetch sticker metadata from CSGO-API
 * Uses in-memory cache to avoid redundant network requests
 *
 * @returns Promise<StickerMetadata[]> Array of all stickers
 */
export async function fetchStickerMetadata(): Promise<StickerMetadata[]> {
  // Check if cache is valid
  const now = Date.now();
  if (
    stickerCache !== null &&
    cacheTimestamp !== null &&
    now - cacheTimestamp < CACHE_DURATION_MS
  ) {
    console.log("[StickerAPI] Using cached metadata", {
      count: stickerCache.length,
      age: Math.round((now - cacheTimestamp) / 1000 / 60) + " minutes",
    });
    return stickerCache;
  }

  // Fetch from API
  console.log("[StickerAPI] Fetching metadata from API...");
  try {
    const response = await fetch(STICKER_API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: StickerMetadata[] = await response.json();

    // Update cache
    stickerCache = data;
    cacheTimestamp = Date.now();

    console.log("[StickerAPI] Metadata fetched successfully", {
      count: data.length,
    });

    return data;
  } catch (error) {
    console.error("[StickerAPI] Failed to fetch metadata", error);

    // Return cached data if available (even if expired)
    if (stickerCache !== null) {
      console.warn("[StickerAPI] Using expired cache as fallback");
      return stickerCache;
    }

    // No cache available, return empty array
    return [];
  }
}

/**
 * Get sticker metadata by CS2 economy def_index
 *
 * @param defIndex CS2 sticker item definition index (e.g., "42", "1234")
 * @returns StickerMetadata | null
 */
export async function getStickerByDefIndex(
  defIndex: string | number
): Promise<StickerMetadata | null> {
  const stickers = await fetchStickerMetadata();
  const defIndexStr = String(defIndex);

  const sticker = stickers.find((s) => s.def_index === defIndexStr);

  if (!sticker) {
    console.warn(`[StickerAPI] Sticker not found for def_index: ${defIndexStr}`);
  }

  return sticker || null;
}

/**
 * Get sticker image URL by CS2 economy def_index
 * Returns full CDN URL or null if not found
 *
 * @param defIndex CS2 sticker item definition index
 * @returns Promise<string | null> Image URL or null
 */
export async function getStickerImageByDefIndex(
  defIndex: string | number
): Promise<string | null> {
  const sticker = await getStickerByDefIndex(defIndex);
  return sticker?.image || null;
}

/**
 * Get sticker image URL synchronously (uses cached data only)
 * Falls back to a placeholder if cache not loaded
 *
 * @param defIndex CS2 sticker item definition index
 * @returns string Image URL or placeholder
 */
export function getStickerImageSync(defIndex: string | number): string {
  if (stickerCache === null) {
    // Cache not loaded yet, return placeholder
    console.warn(
      `[StickerAPI] ❌ Cache not loaded yet! Returning placeholder for def_index: ${defIndex}`
    );
    return getPlaceholderStickerImage();
  }

  const defIndexStr = String(defIndex);
  const sticker = stickerCache.find((s) => s.def_index === defIndexStr);

  if (!sticker) {
    console.warn(
      `[StickerAPI] ⚠️ Sticker not found in cache! def_index: ${defIndexStr}, cache has ${stickerCache.length} stickers`
    );
    return getPlaceholderStickerImage();
  }

  console.log(`[StickerAPI] ✅ Found sticker: ${sticker.name}`);
  return sticker.image;
}

/**
 * Placeholder sticker image (white square with CS2 logo)
 * Used as fallback when real sticker image is unavailable
 */
function getPlaceholderStickerImage(): string {
  // Return a data URI for a simple placeholder
  // This is a 64x64 white square PNG
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAABN0lEQVR4nO2YQQ6CQAxFZxFn8wrcegRuvIJHYOsRuBpn8wruVRkSE1lMaKfTTvN+0mQhC/r/v20pAAAAAAAAAAAAAAD4P1rEtIppP3wZ8nCK6Z5jtMW0j+mQY5xzjBaxPMd0SDE6xuOO6ZBifIzjHdMhxvgYxzumQ4rxMY53TIcU42Mc75gOKcbHON4xHVKMj3G8YzqkGB/jeMd0SDE+xvGO6ZBifIzjHdMhxfgYxzumQ4rxMY53TIcU42Mc75gOKcbHON4xHVKMj3G8YzqkGB/jeMd0SDE+xvGO6ZBifIzjHdMhxfgYxzumQ4rxMY53TIcU42Mc75gOKcbHON4xHVKMj3G8YzqkGB/jeMd0SDE+xvGO6ZBifIzjHdMhxfgYxzumQ4rxMY53TIcU42Mc75gOKcbHON4xAAAAAAAAAAAAAADwS94AugclJO8E0VUAAAAASUVORK5CYII=";
}

/**
 * Preload sticker metadata on app initialization
 * Call this from root loader or app entry point
 */
export async function preloadStickerMetadata(): Promise<void> {
  try {
    await fetchStickerMetadata();
    console.log("[StickerAPI] Metadata preloaded successfully");
  } catch (error) {
    console.error("[StickerAPI] Preload failed", error);
  }
}

/**
 * Clear sticker cache (useful for development/testing)
 */
export function clearStickerCache(): void {
  stickerCache = null;
  cacheTimestamp = null;
  console.log("[StickerAPI] Cache cleared");
}

/**
 * Get cache statistics
 */
export function getStickerCacheStats() {
  return {
    loaded: stickerCache !== null,
    count: stickerCache?.length || 0,
    age: cacheTimestamp
      ? Math.round((Date.now() - cacheTimestamp) / 1000 / 60)
      : null,
    ageUnit: "minutes",
  };
}

/**
 * Search stickers by name (case-insensitive)
 *
 * @param query Search query
 * @param limit Max results (default: 10)
 * @returns Promise<StickerMetadata[]>
 */
export async function searchStickers(
  query: string,
  limit: number = 10
): Promise<StickerMetadata[]> {
  const stickers = await fetchStickerMetadata();
  const lowerQuery = query.toLowerCase();

  return stickers
    .filter((s) => s.name.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
}
