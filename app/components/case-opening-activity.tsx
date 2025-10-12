/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useEffect, useState, useCallback, useMemo } from "react";
import { CS2Economy } from "@ianlucas/cs2-lib";

interface CaseOpening {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  caseItemId: number;
  caseName: string;
  keyItemId: number | null;
  keyName: string | null;
  unlockedItemId: number;
  unlockedName: string;
  unlockedRarity: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface CaseOpeningActivityProps {
  className?: string;
}

// Global function to trigger refresh from anywhere
let globalRefreshCaseOpenings: (() => void) | null = null;

export function refreshCaseOpenings() {
  if (globalRefreshCaseOpenings) {
    globalRefreshCaseOpenings();
  }
}

export function CaseOpeningActivity({ className = "" }: CaseOpeningActivityProps) {
  const [caseOpenings, setCaseOpenings] = useState<CaseOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const fetchCaseOpenings = useCallback(async () => {
    try {
      const response = await fetch("/api/case-openings?limit=15"); // Kevesebb item a gyorsabbért
      const result = await response.json();
      
      if (result.success) {
        setCaseOpenings(result.data);
      }
    } catch (error) {
      console.error("Error fetching case openings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaseOpenings();

    // Register the global refresh function
    globalRefreshCaseOpenings = fetchCaseOpenings;

    // Longer polling interval for better performance (10 seconds instead of 5)
    const interval = setInterval(fetchCaseOpenings, 10000);

    return () => {
      clearInterval(interval);
      globalRefreshCaseOpenings = null;
    };
  }, [fetchCaseOpenings]);

  // Auto-refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchCaseOpenings();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const getRarityColor = (rarity: string) => {
    // Ha már hex színkód, akkor használjuk azt
    if (rarity.startsWith('#')) {
      return rarity;
    }
    
    // Ha szöveges rarity név, akkor térképezzük át
    const rarityColors: Record<string, string> = {
      common: "#b0c3d9",
      uncommon: "#5e98d9", 
      rare: "#4b69ff",
      mythical: "#8847ff",
      legendary: "#d32ce6",
      ancient: "#eb4b4b",
      immortal: "#e4ae39",
      // CS2 specific rarity names
      "consumer grade": "#b0c3d9",
      "industrial grade": "#5e98d9",
      "mil-spec": "#4b69ff",
      "restricted": "#8847ff",
      "classified": "#d32ce6",
      "covert": "#eb4b4b",
      "contraband": "#e4ae39"
    };
    return rarityColors[rarity.toLowerCase()] || "#ffffff";
  };

  const getRarityBackgroundColor = (rarity: string) => {
    const rarityBackgrounds: Record<string, string> = {
      common: "rgba(176, 195, 217, 0.7)",
      uncommon: "rgba(94, 152, 217, 0.7)", 
      rare: "rgba(75, 105, 255, 0.7)",
      mythical: "rgba(136, 71, 255, 0.7)",
      legendary: "rgba(211, 44, 230, 0.7)",
      ancient: "rgba(235, 75, 75, 0.7)",
      immortal: "rgba(228, 174, 57, 0.7)"
    };
    return rarityBackgrounds[rarity.toLowerCase()] || "rgba(255, 255, 255, 0.3)";
  };

  const getRarityGradient = (rarity: string) => {
    const rarityGradients: Record<string, string> = {
      common: "linear-gradient(135deg, rgba(176, 195, 217, 0.8) 0%, rgba(176, 195, 217, 0.3) 100%)",
      uncommon: "linear-gradient(135deg, rgba(94, 152, 217, 0.8) 0%, rgba(94, 152, 217, 0.3) 100%)", 
      rare: "linear-gradient(135deg, rgba(75, 105, 255, 0.8) 0%, rgba(75, 105, 255, 0.3) 100%)",
      mythical: "linear-gradient(135deg, rgba(136, 71, 255, 0.8) 0%, rgba(136, 71, 255, 0.3) 100%)",
      legendary: "linear-gradient(135deg, rgba(211, 44, 230, 0.8) 0%, rgba(211, 44, 230, 0.3) 100%)",
      ancient: "linear-gradient(135deg, rgba(235, 75, 75, 0.8) 0%, rgba(235, 75, 75, 0.3) 100%)",
      immortal: "linear-gradient(135deg, rgba(228, 174, 57, 0.8) 0%, rgba(228, 174, 57, 0.3) 100%)"
    };
    return rarityGradients[rarity.toLowerCase()] || "linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)";
  };

  const getItemImage = (itemId: number) => {
    try {
      const item = CS2Economy.getById(itemId);
      return `${CS2Economy.baseUrl}${item.image}`;
    } catch {
      return `${CS2Economy.baseUrl}econ/default_generated/weapon_ak47_gs_ak47_cartel_light_large.png`; // fallback AK image
    }
  };

  const getCaseImage = (itemId: number) => {
    try {
      const item = CS2Economy.getById(itemId);
      return `${CS2Economy.baseUrl}${item.image}`;
    } catch {
      return `${CS2Economy.baseUrl}econ/default_generated/weapon_case_base_large.png`; // fallback case image
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "most";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} perce`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} órája`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} napja`;
    }
  };

  if (loading) {
    return (
      <div className={`bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 flex flex-col ${className}`}>
        <div className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <i className="fas fa-history"></i>
          Ládanyitási előzmények
        </div>
        <div className="text-gray-400 text-center py-8 flex-1 flex items-center justify-center">
          <div>
            <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <div>Betöltés...</div>
          </div>
        </div>
      </div>
    );
  }

  if (caseOpenings.length === 0) {
    return (
      <div className={`bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 flex flex-col ${className}`}>
        <div className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <i className="fas fa-history"></i>
          Ládanyitási előzmények
        </div>
        <div className="text-gray-400 text-center py-8 flex-1 flex items-center justify-center">
          <div>
            <i className="fas fa-box-open text-2xl mb-2"></i>
            <div>Még nincs ládanyitás</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 flex flex-col ${className}`}>
      <div className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <i className="fas fa-history"></i>
        Ládanyitási előzmények
      </div>

      <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1">
        {caseOpenings.map((opening, index) => (
          <div 
            key={opening.id} 
            className="bg-neutral-900/50 border border-neutral-600 rounded-lg p-3 hover:bg-neutral-900/70 transition-all duration-300 animate-in fade-in slide-in-from-top"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* User info */}
            <div className="flex items-center gap-2 mb-2">
              {opening.user.avatar ? (
                <img 
                  src={opening.user.avatar} 
                  alt={opening.user.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-neutral-600 flex items-center justify-center">
                  <i className="fas fa-user text-xs text-gray-400"></i>
                </div>
              )}
              <span className="text-white font-medium text-sm">
                {opening.user.name}
              </span>
              <span className="text-gray-400 text-xs ml-auto">
                {formatTimeAgo(opening.createdAt)}
              </span>
            </div>

            {/* Case and item info */}
            <div className="text-sm">
              <div className="flex items-center gap-3">
                <i className="fas fa-arrow-right text-gray-500 text-xs"></i>
                
                {/* Large item image with overlay text */}
                <div 
                  className="relative cursor-pointer group flex-1"
                  onMouseEnter={() => setHoveredItemId(opening.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                >
                  <div className="relative w-28 h-28 mx-auto">
                    <img 
                      src={hoveredItemId === opening.id ? getCaseImage(opening.caseItemId) : getItemImage(opening.unlockedItemId)}
                      alt={hoveredItemId === opening.id ? opening.caseName : opening.unlockedName}
                      className="w-full h-full object-contain rounded-lg transition-all duration-300 transform group-hover:scale-105"
                      style={{ 
                        border: `3px solid ${getRarityColor(opening.unlockedRarity)}`
                      }}
                    />
                    
                    {/* Text overlay on image */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white px-2 py-1 rounded-b-lg">
                      <div 
                        className="text-xs font-medium text-center"
                        style={{ color: getRarityColor(opening.unlockedRarity) }}
                      >
                        {hoveredItemId === opening.id ? opening.caseName : opening.unlockedName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}