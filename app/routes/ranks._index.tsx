/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, useLoaderData } from "react-router";
import { requireUser } from "~/auth.server";
import type { Route } from "./+types/ranks._index";
import { useTranslate } from "~/components/app-context";

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
  const translate = useTranslate();
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
    <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
      <div className="my-8">
        {/* Header */}
        <div className="mb-8 text-center">
          {/* Ranks Title */}
          <div className="relative mb-6">
            <h1 className="font-display text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-2xl">
              RANGOK
            </h1>
            <div className="absolute inset-0 text-6xl font-black text-purple-400/20 blur-sm">
              RANGOK
            </div>
          </div>

          {/* Description */}
          <div className="text-center mb-4">
            <p className="font-display text-lg text-neutral-300 font-medium">
              Minden elérhető rang és XP követelmény
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center text-neutral-400 py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <span className="font-display">{translate("RanksLoading")}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 text-center">
            <span className="font-display">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ranks.map((rank) => (
              <div
                key={rank.rank_order}
                className="bg-neutral-900/50 backdrop-blur-sm rounded-lg p-6 border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-900/70 transition-all duration-300"
              >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="font-display px-3 py-1 rounded font-bold text-sm border"
                  style={{
                    backgroundColor: `${rank.rank_color}15`,
                    color: rank.rank_color,
                    borderColor: `${rank.rank_color}40`
                  }}
                >
                  {rank.rank_tag}
                </span>
                <span className="font-display text-neutral-400 text-sm">#{rank.rank_order}</span>
              </div>

              <h3 className="font-display text-xl font-bold text-white mb-4" style={{ color: rank.rank_color }}>{rank.rank_name}</h3>

              <div className="space-y-2 text-sm text-neutral-300">
                <div className="font-display flex justify-between">
                  <span>Min XP:</span>
                  <span className="font-bold text-white">{rank.min_experience.toLocaleString()}</span>
                </div>
                {rank.max_experience !== null && (
                  <div className="font-display flex justify-between">
                    <span>Max XP:</span>
                    <span className="font-bold text-white">{rank.max_experience.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
