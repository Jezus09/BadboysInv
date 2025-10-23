/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";
import { Form, useNavigation, useFetcher } from "react-router";

interface User {
  id: string;
  name: string;
  avatar: string;
}

interface TradePlayerSelectorProps {
  users: User[];
  selectedUser: User | null;
  onUserSelect: (user: User | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading?: boolean;
}

export function TradePlayerSelector({
  users,
  selectedUser,
  onUserSelect,
  searchQuery,
  onSearchChange,
  loading = false
}: TradePlayerSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-700/50 bg-black/30 p-6 backdrop-blur-sm">
      <h3 className="font-display mb-4 font-medium text-white">
        Kereskedési partner kiválasztása
      </h3>

      <div className="relative">
        {/* Search Input */}
        <Form method="get" className="mb-2">
          <div className="relative">
            <input
              type="text"
              name="search"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Keress játékosokat..."
              className="font-display w-full rounded-lg border border-neutral-600/50 bg-black/30 px-4 py-3 pr-10 text-white placeholder-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoComplete="off"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white"></div>
              ) : (
                <svg
                  className="h-4 w-4 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              )}
            </div>
          </div>
        </Form>

        {/* Selected User Display */}
        {selectedUser && (
          <div className="mb-4 rounded-lg border-2 border-blue-500/70 bg-black/40 p-3 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <img
                src={selectedUser.avatar}
                alt={selectedUser.name}
                className="h-10 w-10 rounded-full border border-neutral-600"
              />
              <div>
                <div className="font-display font-medium text-white">
                  {selectedUser.name}
                </div>
                <div className="font-display text-sm text-neutral-400">
                  Kiválasztott partner
                </div>
              </div>
              <button
                onClick={() => onUserSelect(null)}
                className="font-display ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white transition-colors hover:bg-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Dropdown Results */}
        {isDropdownOpen && searchQuery.length >= 2 && !selectedUser && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute top-full right-0 left-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-neutral-700/50 bg-black/90 shadow-lg backdrop-blur-sm">
              {users.length === 0 ? (
                <div className="font-display p-4 text-center text-neutral-400">
                  {loading ? "Keresés..." : "Nem található játékos"}
                </div>
              ) : (
                <div className="py-2">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        onUserSelect(user);
                        setIsDropdownOpen(false);
                      }}
                      className="flex w-full items-center space-x-3 px-4 py-3 text-left transition-colors hover:bg-black/50"
                    >
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-8 w-8 rounded-full border border-neutral-600"
                      />
                      <div>
                        <div className="font-display font-medium text-white">
                          {user.name}
                        </div>
                        <div className="font-display text-sm text-neutral-400">
                          ID: {user.id}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Search Instructions */}
        {!selectedUser && searchQuery.length < 2 && (
          <div className="font-display mt-2 text-sm text-neutral-400">
            Írj be legalább 2 karaktert a kereséshez
          </div>
        )}
      </div>
    </div>
  );
}
