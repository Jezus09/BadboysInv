import { data } from "react-router";
import { getRedis } from "~/redis.server";
import type { Route } from "./+types/api.stickers._index";

const CSGO_API_STICKERS_URL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json";
const CACHE_KEY = "csgo-api:stickers";
const CACHE_TTL = 86400; // 24 hours

interface StickerAPIResponse {
  id: string;
  name: string;
  description?: string;
  rarity?: {
    id: string;
    name: string;
    color: string;
  };
  type?: string;
  market_hash_name?: string;
  effect?: string;
  tournament?: {
    id: number;
    name: string;
  };
  image: string;
}

/**
 * GET /api/stickers
 *
 * Proxy endpoint for CS:GO/CS2 sticker data from CSGO-API (MIT License)
 * Caches results for 24 hours to reduce external API calls
 *
 * Query params:
 *   - type: Filter by sticker type (e.g., "Team", "Event")
 *   - effect: Filter by effect (e.g., "Holo", "Foil", "Gold")
 *   - tournament: Filter by tournament name (e.g., "Katowice 2014")
 *   - search: Search in sticker names
 *   - limit: Limit number of results (default: no limit)
 */
export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get("type");
    const effectFilter = url.searchParams.get("effect");
    const tournamentFilter = url.searchParams.get("tournament");
    const searchQuery = url.searchParams.get("search");
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    // Try to get from cache first
    let stickers: StickerAPIResponse[] | null = null;
    const redis = getRedis();

    if (redis) {
      try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
          console.log("[Stickers API] Cache hit");
          stickers = JSON.parse(cached);
        }
      } catch (cacheError) {
        console.warn("[Stickers API] Cache error:", cacheError);
      }
    }

    // If not in cache, fetch from external API
    if (!stickers) {
      console.log("[Stickers API] Cache miss, fetching from CSGO-API");
      const response = await fetch(CSGO_API_STICKERS_URL);

      if (!response.ok) {
        throw new Error(`CSGO-API returned ${response.status}`);
      }

      stickers = await response.json();

      // Cache for 24 hours
      if (redis) {
        try {
          await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(stickers));
          console.log("[Stickers API] Cached successfully");
        } catch (cacheError) {
          console.warn("[Stickers API] Failed to cache:", cacheError);
        }
      }
    }

    // Apply filters
    let filtered = stickers;

    if (typeFilter) {
      filtered = filtered.filter(s =>
        s.type?.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    if (effectFilter) {
      filtered = filtered.filter(s =>
        s.effect?.toLowerCase() === effectFilter.toLowerCase()
      );
    }

    if (tournamentFilter) {
      filtered = filtered.filter(s =>
        s.tournament?.name.toLowerCase().includes(tournamentFilter.toLowerCase())
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query)
      );
    }

    // Apply limit
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return data({
      success: true,
      count: filtered.length,
      total: stickers.length,
      stickers: filtered,
    });

  } catch (error) {
    console.error("[Stickers API] Error:", error);

    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stickers",
      },
      { status: 500 }
    );
  }
}
