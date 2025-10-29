/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

interface RankBadgeProps {
  rankName: string;
  points: number;
  size?: "small" | "medium" | "large";
}

// CS2-inspired rank configuration
const RANK_CONFIG: Record<string, { color: string; gradient: string; icon: string; tier: string }> = {
  "Unranked": {
    color: "#6b7280",
    gradient: "from-gray-600 to-gray-700",
    icon: "❓",
    tier: "Unranked"
  },
  "Silver I": {
    color: "#9ca3af",
    gradient: "from-gray-400 to-gray-500",
    icon: "🥈",
    tier: "Silver"
  },
  "Silver II": {
    color: "#9ca3af",
    gradient: "from-gray-400 to-gray-500",
    icon: "🥈",
    tier: "Silver"
  },
  "Silver III": {
    color: "#c0c0c0",
    gradient: "from-gray-300 to-gray-400",
    icon: "🥈",
    tier: "Silver"
  },
  "Silver IV": {
    color: "#c0c0c0",
    gradient: "from-gray-300 to-gray-400",
    icon: "🥈",
    tier: "Silver"
  },
  "Silver Elite": {
    color: "#d1d5db",
    gradient: "from-gray-200 to-gray-300",
    icon: "🥈",
    tier: "Silver Elite"
  },
  "Silver Elite Master": {
    color: "#e5e7eb",
    gradient: "from-gray-100 to-gray-200",
    icon: "⭐",
    tier: "Silver Elite"
  },
  "Gold Nova I": {
    color: "#fbbf24",
    gradient: "from-yellow-400 to-yellow-500",
    icon: "⭐",
    tier: "Gold Nova"
  },
  "Gold Nova II": {
    color: "#f59e0b",
    gradient: "from-yellow-500 to-yellow-600",
    icon: "⭐",
    tier: "Gold Nova"
  },
  "Gold Nova III": {
    color: "#d97706",
    gradient: "from-yellow-600 to-amber-600",
    icon: "🌟",
    tier: "Gold Nova"
  },
  "Gold Nova Master": {
    color: "#b45309",
    gradient: "from-amber-600 to-amber-700",
    icon: "🌟",
    tier: "Gold Nova Master"
  },
  "Master Guardian I": {
    color: "#3b82f6",
    gradient: "from-blue-500 to-blue-600",
    icon: "🛡️",
    tier: "Master Guardian"
  },
  "Master Guardian II": {
    color: "#2563eb",
    gradient: "from-blue-600 to-blue-700",
    icon: "🛡️",
    tier: "Master Guardian"
  },
  "Master Guardian Elite": {
    color: "#1d4ed8",
    gradient: "from-blue-700 to-blue-800",
    icon: "🛡️",
    tier: "Master Guardian Elite"
  },
  "Distinguished Master Guardian": {
    color: "#7c3aed",
    gradient: "from-violet-600 to-violet-700",
    icon: "💎",
    tier: "DMG"
  },
  "Legendary Eagle": {
    color: "#a855f7",
    gradient: "from-purple-500 to-purple-600",
    icon: "🦅",
    tier: "Legendary Eagle"
  },
  "Legendary Eagle Master": {
    color: "#9333ea",
    gradient: "from-purple-600 to-purple-700",
    icon: "🦅",
    tier: "LEM"
  },
  "Supreme Master First Class": {
    color: "#ec4899",
    gradient: "from-pink-500 to-pink-600",
    icon: "👑",
    tier: "Supreme"
  },
  "Global Elite": {
    color: "#ef4444",
    gradient: "from-red-500 to-orange-500",
    icon: "🔥",
    tier: "Global Elite"
  }
};

export function RankBadge({ rankName, points, size = "medium" }: RankBadgeProps) {
  const config = RANK_CONFIG[rankName] || RANK_CONFIG["Unranked"];

  const sizeClasses = {
    small: "w-16 h-16 text-2xl",
    medium: "w-24 h-24 text-4xl",
    large: "w-32 h-32 text-5xl"
  };

  const textSizeClasses = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base"
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Rank Badge */}
      <div className="relative group">
        {/* Glow effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300`}
          style={{ transform: 'scale(1.1)' }}
        ></div>

        {/* Badge */}
        <div className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br ${config.gradient} border-4 border-neutral-800 shadow-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
          <span className="drop-shadow-lg">{config.icon}</span>
        </div>

        {/* Shine effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Rank Name */}
      <div className="text-center">
        <div className={`${textSizeClasses[size]} font-bold text-white drop-shadow-lg`}>
          {rankName}
        </div>
        <div className={`${textSizeClasses[size]} text-neutral-400 flex items-center gap-1 justify-center`}>
          <span className="text-yellow-500">⚡</span>
          <span className="font-bold" style={{ color: config.color }}>{points}</span>
          <span>pts</span>
        </div>
      </div>
    </div>
  );
}
