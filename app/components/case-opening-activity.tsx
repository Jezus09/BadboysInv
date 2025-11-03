/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useEffect, useState, useCallback, useMemo } from "react";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { useWindowSize } from "@uidotdev/usehooks";

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
  onCollapseChange?: (isCollapsed: boolean) => void;
}

// Global function to trigger refresh from anywhere
let globalRefreshCaseOpenings: (() => void) | null = null;

export function refreshCaseOpenings() {
  if (globalRefreshCaseOpenings) {
    globalRefreshCaseOpenings();
  }
}

export function CaseOpeningActivity({
  className = "",
  onCollapseChange
}: CaseOpeningActivityProps) {
  const [caseOpenings, setCaseOpenings] = useState<CaseOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const { width } = useWindowSize();
  
  // Always start collapsed (mobile and desktop)
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Notify parent when collapse state changes
  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

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

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const getRarityColor = (rarity: string) => {
    // Ha már hex színkód, akkor használjuk azt
    if (rarity.startsWith("#")) {
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
      restricted: "#8847ff",
      classified: "#d32ce6",
      covert: "#eb4b4b",
      contraband: "#e4ae39"
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
    return (
      rarityBackgrounds[rarity.toLowerCase()] || "rgba(255, 255, 255, 0.3)"
    );
  };

  const getRarityGradient = (rarity: string) => {
    const rarityGradients: Record<string, string> = {
      common:
        "linear-gradient(135deg, rgba(176, 195, 217, 0.8) 0%, rgba(176, 195, 217, 0.3) 100%)",
      uncommon:
        "linear-gradient(135deg, rgba(94, 152, 217, 0.8) 0%, rgba(94, 152, 217, 0.3) 100%)",
      rare: "linear-gradient(135deg, rgba(75, 105, 255, 0.8) 0%, rgba(75, 105, 255, 0.3) 100%)",
      mythical:
        "linear-gradient(135deg, rgba(136, 71, 255, 0.8) 0%, rgba(136, 71, 255, 0.3) 100%)",
      legendary:
        "linear-gradient(135deg, rgba(211, 44, 230, 0.8) 0%, rgba(211, 44, 230, 0.3) 100%)",
      ancient:
        "linear-gradient(135deg, rgba(235, 75, 75, 0.8) 0%, rgba(235, 75, 75, 0.3) 100%)",
      immortal:
        "linear-gradient(135deg, rgba(228, 174, 57, 0.8) 0%, rgba(228, 174, 57, 0.3) 100%)"
    };
    return (
      rarityGradients[rarity.toLowerCase()] ||
      "linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)"
    );
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
      <div
        className={`rounded-lg transition-all duration-300 ${
          isCollapsed
            ? "w-auto h-auto border-transparent bg-transparent pointer-events-none p-0"
            : "p-4 border border-neutral-700 bg-neutral-800/50 pointer-events-auto"
        } flex flex-col ${className}`}
        style={isCollapsed ? { width: 'fit-content', height: 'fit-content' } : undefined}
      >
        <div className={`flex items-center gap-2 text-lg font-bold text-white ${isCollapsed ? '' : 'mb-4'}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-gray-400 transition-colors hover:text-white pointer-events-auto bg-neutral-800/80 rounded-lg border border-neutral-700 hover:bg-neutral-700/80"
            aria-label={
              isCollapsed ? "Előzmények megnyitása" : "Előzmények összecsukása"
            }
          >
            <i
              className={`fas fa-chevron-${isCollapsed ? "right" : "down"} text-sm`}
            ></i>
          </button>
          {!isCollapsed && (
            <>
              <i className="fas fa-history"></i>
              <span>Ládanyitási előzmények</span>
            </>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex flex-1 items-center justify-center py-8 text-center text-gray-400">
            <div>
              <i className="fas fa-spinner fa-spin mb-2 text-2xl"></i>
              <div>Betöltés...</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (caseOpenings.length === 0) {
    return (
      <div
        className={`rounded-lg transition-all duration-300 ${
          isCollapsed
            ? "w-auto h-auto border-transparent bg-transparent pointer-events-none p-0"
            : "p-4 border border-neutral-700 bg-neutral-800/50 pointer-events-auto"
        } flex flex-col ${className}`}
        style={isCollapsed ? { width: 'fit-content', height: 'fit-content' } : undefined}
      >
        <div className={`flex items-center gap-2 text-lg font-bold text-white ${isCollapsed ? '' : 'mb-4'}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-gray-400 transition-colors hover:text-white pointer-events-auto bg-neutral-800/80 rounded-lg border border-neutral-700 hover:bg-neutral-700/80"
            aria-label={
              isCollapsed ? "Előzmények megnyitása" : "Előzmények összecsukása"
            }
          >
            <i
              className={`fas fa-chevron-${isCollapsed ? "right" : "down"} text-sm`}
            ></i>
          </button>
          {!isCollapsed && (
            <>
              <i className="fas fa-history"></i>
              <span>Ládanyitási előzmények</span>
            </>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex flex-1 items-center justify-center py-8 text-center text-gray-400">
            <div>
              <i className="fas fa-box-open mb-2 text-2xl"></i>
              <div>Még nincs ládanyitás</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg transition-all duration-300 ${
        isCollapsed
          ? "w-auto h-auto border-transparent bg-transparent pointer-events-none p-0"
          : "p-4 border border-neutral-700 bg-neutral-800/50 pointer-events-auto"
      } flex flex-col ${className}`}
      style={isCollapsed ? { width: 'fit-content', height: 'fit-content' } : undefined}
    >
      <div className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="-ml-1 p-1 text-gray-400 transition-colors hover:text-white pointer-events-auto"
          aria-label={
            isCollapsed ? "Előzmények megnyitása" : "Előzmények összecsukása"
          }
        >
          <i
            className={`fas fa-chevron-${isCollapsed ? "right" : "down"} text-sm`}
          ></i>
        </button>
        <i className="fas fa-history"></i>
        {!isCollapsed && "Ládanyitási előzmények"}
      </div>

      {!isCollapsed && (
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto">
          {caseOpenings.map((opening, index) => (
            <div
              key={opening.id}
              className="animate-in fade-in slide-in-from-top rounded-lg border border-neutral-600 bg-neutral-900/50 p-3 transition-all duration-300 hover:bg-neutral-900/70"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* User info */}
              <div className="mb-2 flex items-center gap-2">
                {opening.user.avatar ? (
                  <img
                    src={opening.user.avatar}
                    alt={opening.user.name}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-600">
                    <i className="fas fa-user text-xs text-gray-400"></i>
                  </div>
                )}
                <span className="text-sm font-medium text-white">
                  {opening.user.name}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {formatTimeAgo(opening.createdAt)}
                </span>
              </div>

              {/* Case and item info */}
              <div className="text-sm">
                <div className="flex items-center gap-3">
                  <i className="fas fa-arrow-right text-xs text-gray-500"></i>

                  {/* Large item image with overlay text */}
                  <div
                    className="group relative flex-1 cursor-pointer"
                    onMouseEnter={() => setHoveredItemId(opening.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                  >
                    <div className="relative mx-auto h-28 w-28">
                      <img
                        src={
                          hoveredItemId === opening.id
                            ? getCaseImage(opening.caseItemId)
                            : getItemImage(opening.unlockedItemId)
                        }
                        alt={
                          hoveredItemId === opening.id
                            ? opening.caseName
                            : opening.unlockedName
                        }
                        className="h-full w-full transform rounded-lg object-contain transition-all duration-300 group-hover:scale-105"
                        style={{
                          border: `3px solid ${getRarityColor(opening.unlockedRarity)}`
                        }}
                      />

                      {/* Text overlay on image */}
                      <div className="absolute right-0 bottom-0 left-0 rounded-b-lg bg-black/80 px-2 py-1 text-white">
                        <div
                          className="text-center text-xs font-medium"
                          style={{
                            color: getRarityColor(opening.unlockedRarity)
                          }}
                        >
                          {hoveredItemId === opening.id
                            ? opening.caseName
                            : opening.unlockedName}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
