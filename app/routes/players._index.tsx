/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, useNavigate } from "react-router";
import { middleware } from "~/http.server";
import { getMetaTitle } from "~/root-meta";
import { Modal, ModalHeader } from "~/components/modal";
import type { Route } from "./+types/players._index";

export const meta = getMetaTitle("Search Players");

export async function loader({ request }: Route.LoaderArgs) {
  await middleware(request);
  return data({});
}

interface Player {
  id: string;
  name: string;
  avatar: string;
}

export default function PlayersSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setPlayers([]);
      return;
    }

    const searchPlayers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setPlayers(data.players || []);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPlayers, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handlePlayerClick = (playerId: string) => {
    navigate(`/profile/${playerId}`);
  };

  return (
    <Modal className="w-[95%] max-w-[600px] max-h-[90vh]">
      <ModalHeader title="Search Players" linkTo="/" />

      <div className="mt-4 px-4 pb-4">
        {/* Title */}
        <div className="relative mb-6 text-center">
          <h1 className="font-display bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-4xl font-black text-transparent drop-shadow-2xl">
            FIND PLAYERS
          </h1>
          <div className="absolute inset-0 text-4xl font-black text-blue-400/10 blur-sm">
            FIND PLAYERS
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by player name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-sm border border-neutral-500/30 bg-black/40 px-4 py-3 text-white placeholder-neutral-500 focus:border-neutral-400 focus:outline-none"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[500px] overflow-y-auto">
          {loading && (
            <div className="text-center py-8 text-neutral-400">
              Searching...
            </div>
          )}

          {!loading && query.length >= 2 && players.length === 0 && (
            <div className="text-center py-8 text-neutral-400">
              No players found
            </div>
          )}

          {!loading && players.length > 0 && (
            <div className="space-y-2">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  className="w-full flex items-center gap-4 rounded-sm border border-neutral-500/20 bg-black/40 p-3 hover:border-neutral-400/40 hover:bg-black/60 transition-colors text-left"
                >
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-12 h-12 rounded-sm border border-neutral-500/30"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">{player.name}</div>
                    <div className="text-xs text-neutral-400">Click to view profile</div>
                  </div>
                  <div className="text-neutral-500">→</div>
                </button>
              ))}
            </div>
          )}

          {query.length > 0 && query.length < 2 && (
            <div className="text-center py-8 text-neutral-400">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
