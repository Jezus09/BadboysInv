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
    <div className="bg-black/30 rounded-lg p-6 border border-neutral-700/50 backdrop-blur-sm">
      <h3 className="font-display text-white font-medium mb-4">Kereskedési partner kiválasztása</h3>
      
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
              className="font-display w-full bg-black/30 text-white placeholder-neutral-400 rounded-lg px-4 py-3 pr-10 border border-neutral-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoComplete="off"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-400 border-t-white"></div>
              ) : (
                <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
        </Form>

        {/* Selected User Display */}
        {selectedUser && (
          <div className="mb-4 p-3 bg-black/40 rounded-lg border-2 border-blue-500/70 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <img 
                src={selectedUser.avatar} 
                alt={selectedUser.name}
                className="w-10 h-10 rounded-full border border-neutral-600"
              />
              <div>
                <div className="font-display text-white font-medium">{selectedUser.name}</div>
                <div className="font-display text-neutral-400 text-sm">Kiválasztott partner</div>
              </div>
              <button
                onClick={() => onUserSelect(null)}
                className="font-display ml-auto w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
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
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-black/90 rounded-lg shadow-lg border border-neutral-700/50 backdrop-blur-sm max-h-60 overflow-y-auto">
              {users.length === 0 ? (
                <div className="font-display p-4 text-neutral-400 text-center">
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
                      className="w-full px-4 py-3 text-left hover:bg-black/50 transition-colors flex items-center space-x-3"
                    >
                      <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="w-8 h-8 rounded-full border border-neutral-600"
                      />
                      <div>
                        <div className="font-display text-white font-medium">{user.name}</div>
                        <div className="font-display text-neutral-400 text-sm">ID: {user.id}</div>
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
          <div className="font-display text-neutral-400 text-sm mt-2">
            Írj be legalább 2 karaktert a kereséshez
          </div>
        )}
      </div>
    </div>
  );
}