/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useEffect, useState, useCallback, useRef } from "react";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { useWindowSize } from "@uidotdev/usehooks";
import { useUser } from "~/components/app-context";

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
  messages?: ChatMessage[];
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  message: string;
  createdAt: string;
  replyTo?: string;
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

export function CaseOpeningActivity({
  className = ""
}: CaseOpeningActivityProps) {
  const user = useUser();
  const [caseOpenings, setCaseOpenings] = useState<CaseOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const { width } = useWindowSize();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [initializedCollapse, setInitializedCollapse] = useState(false);

  useEffect(() => {
    if (!initializedCollapse && width !== null) {
      setIsCollapsed(width <= 1024);
      setInitializedCollapse(true);
    }
  }, [width, initializedCollapse]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(cooldownRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  const fetchCaseOpenings = useCallback(async () => {
    try {
      const response = await fetch("/api/case-openings?limit=15");
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
    globalRefreshCaseOpenings = fetchCaseOpenings;

    const interval = setInterval(fetchCaseOpenings, 10000);

    return () => {
      clearInterval(interval);
      globalRefreshCaseOpenings = null;
    };
  }, [fetchCaseOpenings]);

  const handleSendMessage = async (openingId: string) => {
    if (!user || !messageInput.trim()) return;

    const now = Date.now();
    const timeSinceLastMessage = (now - lastMessageTime) / 1000;

    if (timeSinceLastMessage < 15) {
      setCooldownRemaining(Math.ceil(15 - timeSinceLastMessage));
      return;
    }

    try {
      const response = await fetch("/api/case-openings/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseOpeningId: openingId,
          message: messageInput,
          replyToId: replyingTo
        })
      });

      if (response.ok) {
        setMessageInput("");
        setReplyingTo(null);
        setLastMessageTime(now);
        fetchCaseOpenings();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getRarityColor = (rarity: string) => {
    if (rarity.startsWith("#")) return rarity;

    const rarityColors: Record<string, string> = {
      common: "#b0c3d9",
      uncommon: "#5e98d9",
      rare: "#4b69ff",
      mythical: "#8847ff",
      legendary: "#d32ce6",
      ancient: "#eb4b4b",
      immortal: "#e4ae39"
    };
    return rarityColors[rarity.toLowerCase()] || "#ffffff";
  };

  const getItemImage = (itemId: number) => {
    try {
      const item = CS2Economy.getById(itemId);
      return `${CS2Economy.baseUrl}${item.image}`;
    } catch {
      return `${CS2Economy.baseUrl}econ/default_generated/weapon_ak47_gs_ak47_cartel_light_large.png`;
    }
  };

  const getCaseImage = (itemId: number) => {
    try {
      const item = CS2Economy.getById(itemId);
      return `${CS2Economy.baseUrl}${item.image}`;
    } catch {
      return `${CS2Economy.baseUrl}econ/default_generated/weapon_case_base_large.png`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "most";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} perce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} órája`;
    return `${Math.floor(diffInSeconds / 86400)} napja`;
  };

  if (loading) {
    return (
      <div
        className={`flex flex-col rounded-xl border-2 border-purple-500/30 backdrop-blur-md transition-all duration-300 ${
          isCollapsed
            ? "w-auto bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-2"
            : "max-h-[calc(100vh-1rem)] w-80 bg-gradient-to-br from-neutral-900/95 to-neutral-800/95 p-4 shadow-2xl md:max-h-[calc(100vh-2rem)] md:w-96"
        } ${className}`}
      >
        <div className={`flex items-center gap-3 ${isCollapsed ? "mb-0" : "mb-4"}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`group flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 focus:ring-2 focus:ring-purple-500 focus:outline-none ${
              isCollapsed
                ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70 hover:scale-110"
                : "bg-neutral-700/50 text-gray-300 hover:bg-neutral-600 hover:text-white"
            }`}
          >
            <i className={`fas fa-${isCollapsed ? "comments" : "chevron-down"} text-base transition-transform duration-300 ${isCollapsed ? "group-hover:scale-110" : ""}`}></i>
          </button>
          {!isCollapsed && (
            <div className="flex-1">
              <h3 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-lg font-bold text-transparent">
                Ládanyitás Chat
              </h3>
              <p className="text-xs text-gray-400">Gratulálj a szerencsés játékosoknak!</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="text-center">
              <div className="mb-3 inline-block animate-spin rounded-full border-4 border-purple-500/30 border-t-purple-500 h-12 w-12"></div>
              <div className="text-gray-400">Betöltés...</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (caseOpenings.length === 0) {
    return (
      <div
        className={`flex flex-col rounded-xl border-2 border-purple-500/30 backdrop-blur-md transition-all duration-300 ${
          isCollapsed
            ? "w-auto bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-2"
            : "max-h-[calc(100vh-1rem)] w-80 bg-gradient-to-br from-neutral-900/95 to-neutral-800/95 p-4 shadow-2xl md:max-h-[calc(100vh-2rem)] md:w-96"
        } ${className}`}
      >
        <div className={`flex items-center gap-3 ${isCollapsed ? "mb-0" : "mb-4"}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`group flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 focus:ring-2 focus:ring-purple-500 focus:outline-none ${
              isCollapsed
                ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70 hover:scale-110"
                : "bg-neutral-700/50 text-gray-300 hover:bg-neutral-600 hover:text-white"
            }`}
          >
            <i className={`fas fa-${isCollapsed ? "comments" : "chevron-down"} text-base transition-transform duration-300 ${isCollapsed ? "group-hover:scale-110" : ""}`}></i>
          </button>
          {!isCollapsed && (
            <div className="flex-1">
              <h3 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-lg font-bold text-transparent">
                Ládanyitás Chat
              </h3>
              <p className="text-xs text-gray-400">Gratulálj a szerencsés játékosoknak!</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="text-center text-gray-400">
              <i className="fas fa-box-open mb-2 text-3xl"></i>
              <div>Még nincs ládanyitás</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-xl border-2 border-purple-500/30 backdrop-blur-md transition-all duration-300 ${
        isCollapsed
          ? "w-auto bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-2"
          : "max-h-[calc(100vh-1rem)] w-80 bg-gradient-to-br from-neutral-900/95 to-neutral-800/95 p-4 shadow-2xl md:max-h-[calc(100vh-2rem)] md:w-96"
      } ${className}`}
    >
      <div className={`flex items-center gap-3 ${isCollapsed ? "mb-0" : "mb-4"}`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`group flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 focus:ring-2 focus:ring-purple-500 focus:outline-none ${
            isCollapsed
              ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70 hover:scale-110"
              : "bg-neutral-700/50 text-gray-300 hover:bg-neutral-600 hover:text-white"
          }`}
        >
          <i className={`fas fa-${isCollapsed ? "comments" : "chevron-down"} text-base transition-transform duration-300 ${isCollapsed ? "group-hover:scale-110" : ""}`}></i>
        </button>
        {!isCollapsed && (
          <div className="flex-1">
            <h3 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-lg font-bold text-transparent">
              Ládanyitás Chat
            </h3>
            <p className="text-xs text-gray-400">Gratulálj a szerencsés játékosoknak!</p>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
          {caseOpenings.map((opening, index) => (
            <div
              key={opening.id}
              className="group animate-in fade-in slide-in-from-top relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-neutral-800/80 to-neutral-900/80 p-4 transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20"
              style={{
                animationDelay: `${index * 50}ms`,
                animationDuration: "500ms"
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${getRarityColor(opening.unlockedRarity)}15, transparent 70%)`
                }}
              />

              {/* User info */}
              <div className="relative mb-3 flex items-center gap-2">
                {opening.user.avatar ? (
                  <img
                    src={opening.user.avatar}
                    alt={opening.user.name}
                    className="h-8 w-8 rounded-full ring-2 ring-purple-500/30"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
                    <i className="fas fa-user text-xs text-white"></i>
                  </div>
                )}
                <div className="flex-1">
                  <span className="block text-sm font-bold text-white">
                    {opening.user.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(opening.createdAt)}
                  </span>
                </div>
              </div>

              {/* Item showcase */}
              <div
                className="group/item relative mb-3 cursor-pointer"
                onMouseEnter={() => setHoveredItemId(opening.id)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <div className="relative mx-auto h-32 w-32">
                  {/* Rarity glow */}
                  <div
                    className="absolute inset-0 rounded-lg blur-xl transition-opacity duration-300"
                    style={{
                      backgroundColor: `${getRarityColor(opening.unlockedRarity)}40`,
                      opacity: hoveredItemId === opening.id ? 0.8 : 0.4
                    }}
                  />

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
                    className="relative h-full w-full transform rounded-lg object-contain transition-all duration-300 group-hover/item:scale-110 group-hover/item:rotate-3"
                    style={{
                      filter: `drop-shadow(0 0 20px ${getRarityColor(opening.unlockedRarity)}80)`
                    }}
                  />
                </div>

                {/* Item name */}
                <div className="mt-2 rounded-lg bg-black/60 px-3 py-2 backdrop-blur-sm">
                  <div
                    className="text-center text-xs font-bold"
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

              {/* Chat messages */}
              {opening.messages && opening.messages.length > 0 && (
                <div className="mb-3 space-y-2 rounded-lg bg-black/40 p-2">
                  {opening.messages.slice(0, 3).map((msg) => (
                    <div key={msg.id} className="text-xs">
                      <span className="font-semibold text-purple-400">
                        {msg.userName}:
                      </span>{" "}
                      <span className="text-gray-300">{msg.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Message input */}
              {user && (
                <div className="relative">
                  {replyingTo === opening.id && (
                    <div className="mb-1 flex items-center gap-2 text-xs text-purple-400">
                      <i className="fas fa-reply"></i>
                      <span>Válasz...</span>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="ml-auto text-gray-400 hover:text-white"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={replyingTo === opening.id ? messageInputRef : null}
                      type="text"
                      value={replyingTo === opening.id ? messageInput : ""}
                      onChange={(e) => {
                        setReplyingTo(opening.id);
                        setMessageInput(e.target.value);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleSendMessage(opening.id);
                        }
                      }}
                      placeholder={cooldownRemaining > 0 ? `Várj ${cooldownRemaining}mp...` : "Gratulálj..."}
                      disabled={cooldownRemaining > 0}
                      className="flex-1 rounded-lg border border-purple-500/30 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:border-purple-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      onClick={() => handleSendMessage(opening.id)}
                      disabled={cooldownRemaining > 0 || !messageInput.trim()}
                      className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
