/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, useLoaderData } from "react-router";
import { requireUser } from "~/auth.server";
import type { Route } from "./+types/ranks._index";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return data({});
}

interface Rank {
  rank_order: number;
  rank_name: string;
  rank_tag: string;
  rank_color: string;
  min_experience: number;
  max_experience: number | null;
}

export default function RanksPage() {
  useLoaderData<typeof loader>();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanks = async () => {
      try {
        const response = await fetch('/api/ranks');
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load ranks');
        }

        setRanks(data.ranks);
      } catch (err) {
        console.error('Error loading ranks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ranks');
      } finally {
        setLoading(false);
      }
    };

    fetchRanks();
  }, []);

  return (
    <div className="m-auto max-w-7xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">🏆 CS2 Ranks</h1>
        <p className="text-neutral-400">View all available ranks and their XP requirements</p>
      </div>

      {loading && (
        <div className="text-center text-neutral-400 py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          Loading ranks...
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 text-center">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ranks.map((rank) => (
            <div
              key={rank.rank_order}
              className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-lg p-6 border-2 hover:scale-105 transition-transform"
              style={{ borderColor: rank.rank_color }}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="px-3 py-1 rounded font-bold text-sm"
                  style={{
                    backgroundColor: `${rank.rank_color}20`,
                    color: rank.rank_color
                  }}
                >
                  {rank.rank_tag}
                </span>
                <span className="text-neutral-400 text-sm">#{rank.rank_order}</span>
              </div>

              <h3 className="text-xl font-bold text-white mb-4">{rank.rank_name}</h3>

              <div className="space-y-2 text-sm text-neutral-300">
                <div className="flex justify-between">
                  <span>Min XP:</span>
                  <span className="font-bold">{rank.min_experience.toLocaleString()}</span>
                </div>
                {rank.max_experience !== null && (
                  <div className="flex justify-between">
                    <span>Max XP:</span>
                    <span className="font-bold">{rank.max_experience.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
