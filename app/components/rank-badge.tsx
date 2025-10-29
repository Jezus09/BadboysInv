/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState } from "react";

interface RankBadgeProps {
  rankName: string;
  points: number;
  size?: "small" | "medium" | "large";
}

// CS2 Competitive Ranks with official images
const RANK_CONFIG: Record<string, { rankId: number; color: string; gradient: string }> = {
  "Unranked": {
    rankId: 0,
    color: "#6b7280",
    gradient: "from-gray-600 to-gray-700"
  },
  "Silver I": {
    rankId: 1,
    color: "#9ca3af",
    gradient: "from-gray-400 to-gray-500"
  },
  "Silver II": {
    rankId: 2,
    color: "#9ca3af",
    gradient: "from-gray-400 to-gray-500"
  },
  "Silver III": {
    rankId: 3,
    color: "#c0c0c0",
    gradient: "from-gray-300 to-gray-400"
  },
  "Silver IV": {
    rankId: 4,
    color: "#c0c0c0",
    gradient: "from-gray-300 to-gray-400"
  },
  "Silver Elite": {
    rankId: 5,
    color: "#d1d5db",
    gradient: "from-gray-200 to-gray-300"
  },
  "Silver Elite Master": {
    rankId: 6,
    color: "#e5e7eb",
    gradient: "from-gray-100 to-gray-200"
  },
  "Gold Nova I": {
    rankId: 7,
    color: "#fbbf24",
    gradient: "from-yellow-400 to-yellow-500"
  },
  "Gold Nova II": {
    rankId: 8,
    color: "#f59e0b",
    gradient: "from-yellow-500 to-yellow-600"
  },
  "Gold Nova III": {
    rankId: 9,
    color: "#d97706",
    gradient: "from-yellow-600 to-amber-600"
  },
  "Gold Nova Master": {
    rankId: 10,
    color: "#b45309",
    gradient: "from-amber-600 to-amber-700"
  },
  "Master Guardian I": {
    rankId: 11,
    color: "#3b82f6",
    gradient: "from-blue-500 to-blue-600"
  },
  "Master Guardian II": {
    rankId: 12,
    color: "#2563eb",
    gradient: "from-blue-600 to-blue-700"
  },
  "Master Guardian Elite": {
    rankId: 13,
    color: "#1d4ed8",
    gradient: "from-blue-700 to-blue-800"
  },
  "Distinguished Master Guardian": {
    rankId: 14,
    color: "#7c3aed",
    gradient: "from-violet-600 to-violet-700"
  },
  "Legendary Eagle": {
    rankId: 15,
    color: "#a855f7",
    gradient: "from-purple-500 to-purple-600"
  },
  "Legendary Eagle Master": {
    rankId: 16,
    color: "#9333ea",
    gradient: "from-purple-600 to-purple-700"
  },
  "Supreme Master First Class": {
    rankId: 17,
    color: "#ec4899",
    gradient: "from-pink-500 to-pink-600"
  },
  "Global Elite": {
    rankId: 18,
    color: "#ef4444",
    gradient: "from-red-500 to-orange-500"
  }
};

export function RankBadge({ rankName, points, size = "medium" }: RankBadgeProps) {
  const config = RANK_CONFIG[rankName] || RANK_CONFIG["Unranked"];

  // Try multiple CDN sources for CS2 rank images
  const rankImageUrl = config.rankId > 0
    ? `https://raw.githubusercontent.com/xPaw/CounterStrikeSharp/main/docs/images/ranks/rank${config.rankId}.png`
    : `https://raw.githubusercontent.com/xPaw/CounterStrikeSharp/main/docs/images/ranks/rank0.png`;

  // Fallback: display rank ID as badge if image fails
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    small: "w-20 h-20",
    medium: "w-32 h-32",
    large: "w-40 h-40"
  };

  const imageSizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-32 h-32"
  };

  const textSizeClasses = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-lg"
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Rank Badge with Image */}
      <div className="relative group">
        {/* Glow effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-lg blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-300`}
          style={{ transform: 'scale(1.2)' }}
        ></div>

        {/* Badge Container */}
        <div className={`relative ${sizeClasses[size]} rounded-lg bg-gradient-to-br from-neutral-900/80 to-neutral-800/80 border-2 border-neutral-700/50 shadow-2xl flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 group-hover:border-neutral-600`}>
          {!imageError ? (
            /* Rank Image */
            <img
              src={rankImageUrl}
              alt={rankName}
              className={`${imageSizeClasses[size]} object-contain drop-shadow-2xl`}
              style={{
                filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))'
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            /* Fallback: Colored badge with rank ID */
            <div className="flex flex-col items-center justify-center">
              <div
                className="text-6xl font-black drop-shadow-2xl"
                style={{ color: config.color }}
              >
                {config.rankId}
              </div>
              <div className="text-xs text-neutral-400 uppercase tracking-wider">
                RANK
              </div>
            </div>
          )}

          {/* Shine effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      </div>

      {/* Rank Name and Points */}
      <div className="text-center">
        <div className={`${textSizeClasses[size]} font-bold text-white drop-shadow-lg mb-1`}>
          {rankName}
        </div>
        <div className={`${textSizeClasses[size]} text-neutral-400 flex items-center gap-1 justify-center`}>
          <span className="font-bold" style={{ color: config.color }}>{points}</span>
          <span>points</span>
        </div>
      </div>
    </div>
  );
}
