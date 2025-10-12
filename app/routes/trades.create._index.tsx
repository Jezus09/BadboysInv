/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useRef } from "react";
import { data, redirect, useLoaderData, useFetcher, Link } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { requireUser } from "~/auth.server";
import { getUserInventory } from "~/models/user.server";
import { searchUsers, createTrade } from "~/models/trade.server";
import { useUser } from "~/components/app-context";
import { TradePlayerSelector } from "~/components/trade-player-selector";
import { TradeInventoryGrid } from "~/components/trade-inventory-grid";
import { CurrencyDisplay } from "~/components/currency-display";
import { parseInventory } from "~/utils/inventory";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const inventoryString = await getUserInventory(user.id);
  
  console.log("Trade create loader - User ID:", user.id);
  console.log("Trade create loader - Raw inventory string:", inventoryString?.substring(0, 200) + "...");
  
  // Use the official parseInventory function that matches the main app
  const parsedInventoryData = parseInventory(inventoryString);
  console.log("Trade create loader - Parsed inventory data:", parsedInventoryData ? "valid" : "invalid");
  
  let inventory: any[] = [];
  if (parsedInventoryData && parsedInventoryData.items) {
    // Convert the official inventory format to array for trade UI
    inventory = Object.values(parsedInventoryData.items).map((item: any, index: number) => ({
      ...item,
      uid: item.uid || index + 1000 // Ensure UID exists
    }));
    console.log("Trade create loader - Using official inventory format, items count:", inventory.length);
  } else {
    console.log("Trade create loader - No valid inventory found");
  }
  
  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  
  let users: any[] = [];
  if (search) {
    try {
      users = await searchUsers(search, user.id);
    } catch (error) {
      console.error("Error searching users:", error);
      users = [];
    }
  }
  
  return data({ inventory: inventory || [], users: users || [], search });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  
  const receiverId = formData.get("receiverId") as string;
  const senderItems = JSON.parse(formData.get("senderItems") as string || "[]");
  const receiverItems = JSON.parse(formData.get("receiverItems") as string || "[]");
  const senderCoins = parseFloat(formData.get("senderCoins") as string || "0");
  const receiverCoins = parseFloat(formData.get("receiverCoins") as string || "0");
  const message = formData.get("message") as string;
  
  try {
    // Create trade directly using the server function
    const trade = await createTrade({
      senderUserId: user.id,
      receiverUserId: receiverId,
      senderItems,
      receiverItems,
      senderCoins,
      receiverCoins,
      message
    });
    
    if (trade) {
      return redirect("/trades");
    }
    
    return data({ error: "Failed to create trade" }, { status: 400 });
  } catch (error) {
    console.error("Trade creation error:", error);
    return data({ error: "Failed to create trade" }, { status: 500 });
  }
}

export default function CreateTradePage() {
  const { inventory, users, search } = useLoaderData<typeof loader>();
  const user = useUser();
  const fetcher = useFetcher();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
  const [receiverInventory, setReceiverInventory] = useState<any[]>([]);
  const [loadingReceiverInventory, setLoadingReceiverInventory] = useState(false);
  const [senderItems, setSenderItems] = useState<any[]>([]);
  const [receiverItems, setReceiverItems] = useState<any[]>([]);
  const [senderCoins, setSenderCoins] = useState(0);
  const [receiverCoins, setReceiverCoins] = useState(0);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState(search || "");

  // Function to load receiver's inventory
  const loadReceiverInventory = async (userId: string) => {
    setLoadingReceiverInventory(true);
    try {
      const response = await fetch(`/api/trade?action=get-user-inventory&userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setReceiverInventory(data.inventory || []);
      } else {
        console.error('Failed to load receiver inventory:', data.message);
        setReceiverInventory([]);
      }
    } catch (error) {
      console.error('Error loading receiver inventory:', error);
      setReceiverInventory([]);
    } finally {
      setLoadingReceiverInventory(false);
    }
  };

  // Update selected receiver and load their inventory
  const handleReceiverSelect = (receiver: any) => {
    setSelectedReceiver(receiver);
    setReceiverItems([]); // Clear previously selected items
    if (receiver) {
      loadReceiverInventory(receiver.id);
    } else {
      setReceiverInventory([]);
    }
  };

  // Handle search query change with fetcher (no page reload)
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.length >= 2) {
      // Debounce the search and use fetcher instead of page reload
      searchTimeoutRef.current = setTimeout(() => {
        fetcher.load(`/trades/create?search=${encodeURIComponent(query)}`);
      }, 500); // Reduced to 500ms for better UX
    }
  };

  const handleItemSelect = (item: any, isOffer: boolean) => {
    if (isOffer) {
      // Selecting from our inventory to offer
      setSenderItems(prev => 
        prev.find(i => i.uid === item.uid) 
          ? prev.filter(i => i.uid !== item.uid)
          : [...prev, item]
      );
    } else {
      // Selecting from their inventory that we want
      setReceiverItems(prev => 
        prev.find(i => i.uid === item.uid) 
          ? prev.filter(i => i.uid !== item.uid)
          : [...prev, item]
      );
    }
  };

  const handleSubmit = () => {
    if (!selectedReceiver || (!senderItems.length && !receiverItems.length && senderCoins === 0 && receiverCoins === 0)) {
      return;
    }
    
    // Use FormData instead of JSON
    const formData = new FormData();
    formData.append("receiverId", selectedReceiver.id);
    formData.append("senderItems", JSON.stringify(senderItems));
    formData.append("receiverItems", JSON.stringify(receiverItems));
    formData.append("senderCoins", senderCoins.toString());
    formData.append("receiverCoins", receiverCoins.toString());
    formData.append("message", message);
    
    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
      <div className="my-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="relative mb-6">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 drop-shadow-2xl">
              ÚJ KERESKEDÉS
            </h1>
            <div className="absolute inset-0 text-6xl font-black text-blue-400/20 blur-sm">
              ÚJ KERESKEDÉS
            </div>
          </div>
          
          <div className="text-center mb-4">
            <p className="font-display text-lg text-neutral-300 font-medium">
              Válassz játékost és itemeket a kereskedéshez
            </p>
          </div>
          
          <div className="mb-6">
            <Link
              to="/trades"
              className="font-display inline-flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 bg-gray-600/20 border border-gray-500/30 rounded"
            >
              ← Vissza a kereskedésekhez
            </Link>
          </div>
        </div>

          {/* Player Selection */}
          <div className="mb-8">
            <TradePlayerSelector
              users={fetcher.data?.users || users}
              selectedUser={selectedReceiver}
              onUserSelect={handleReceiverSelect}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              loading={fetcher.state === "loading"}
            />
          </div>

          {/* Trade Interface */}
          {selectedReceiver && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
              {/* Your Inventory */}
              <div className="space-y-6">
                <TradeInventoryGrid
                  title="Your Inventory"
                  items={inventory}
                  selectedItems={senderItems}
                  onItemClick={(item) => handleItemSelect(item, true)}
                  emptyMessage="No items in your inventory"
                  className="min-h-[400px]"
                />
                
                {/* Your Offer */}
                <TradeInventoryGrid
                  title="Your Offer"
                  items={senderItems}
                  selectedItems={senderItems} // All items in offer are "selected" for remove
                  onItemRemove={(item) => handleItemSelect(item, true)}
                  showRemoveButtons={true}
                  emptyMessage="Select items from your inventory to offer"
                  className="bg-green-900/20 border border-green-500/30"
                />
                
                {/* Your Coins Offer */}
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h3 className="font-display text-white font-medium mb-4">Coins You Offer</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={senderCoins}
                      onChange={(e) => setSenderCoins(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                    <CurrencyDisplay 
                      amount="0" 
                      className="text-yellow-400"
                      showIcon={true}
                    />
                  </div>
                  {senderCoins > 0 && (
                    <p className="text-green-400 text-sm mt-2">
                      Offering: <CurrencyDisplay amount={senderCoins.toString()} showIcon={true} />
                    </p>
                  )}
                </div>
              </div>

              {/* Their Inventory */}
              <div className="space-y-6">
                <TradeInventoryGrid
                  title={`${selectedReceiver.name}'s Inventory`}
                  items={receiverInventory}
                  selectedItems={receiverItems}
                  onItemClick={(item) => handleItemSelect(item, false)}
                  emptyMessage={
                    loadingReceiverInventory 
                      ? "Loading inventory..." 
                      : "No items in their inventory"
                  }
                  className="min-h-[400px]"
                />
                
                {/* Your Request */}
                <TradeInventoryGrid
                  title="Items You Want"
                  items={receiverItems}
                  selectedItems={receiverItems} // All items in request are "selected" for remove
                  onItemRemove={(item) => handleItemSelect(item, false)}
                  showRemoveButtons={true}
                  emptyMessage="Select items from their inventory to request"
                  className="bg-blue-900/20 border border-blue-500/30"
                />
                
                {/* Coins You Want */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="font-display text-white font-medium mb-4">Coins You Want</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receiverCoins}
                      onChange={(e) => setReceiverCoins(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                    <CurrencyDisplay 
                      amount="0" 
                      className="text-yellow-400"
                      showIcon={true}
                    />
                  </div>
                  {receiverCoins > 0 && (
                    <p className="text-blue-400 text-sm mt-2">
                      Requesting: <CurrencyDisplay amount={receiverCoins.toString()} showIcon={true} />
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Trade Message */}
          {selectedReceiver && (
            <div className="mb-8">
              <div className="relative">
                {/* Modern glass-morphism container */}
                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-neutral-700/50 shadow-xl">
                  {/* Header with icon */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">💬</span>
                    </div>
                    <h3 className="font-display text-white font-semibold text-lg">
                      Trade Message 
                      <span className="text-neutral-400 font-normal text-sm ml-2">(Optional)</span>
                    </h3>
                  </div>
                  
                  {/* Modern textarea */}
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Add a message to your trade offer..."
                      rows={3}
                      maxLength={200}
                      className="w-full px-4 py-4 bg-gradient-to-br from-neutral-800/80 to-neutral-700/80 text-white placeholder-neutral-400 rounded-xl border border-neutral-600/50 focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none transition-all duration-300 backdrop-blur-sm shadow-inner"
                    />
                    {/* Character counter */}
                    <div className="absolute bottom-3 right-3 text-xs text-neutral-500">
                      {message.length}/200
                    </div>
                  </div>
                  
                  {/* Subtle decorative elements */}
                  <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400/30 rounded-full"></div>
                  <div className="absolute bottom-2 left-2 w-1 h-1 bg-purple-400/40 rounded-full"></div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedReceiver && (
            <div className="flex justify-center space-x-4 mb-20 relative z-20">
              <button
                onClick={handleSubmit}
                disabled={!selectedReceiver || (!senderItems.length && !receiverItems.length && senderCoins === 0 && receiverCoins === 0) || fetcher.state !== "idle"}
                className="group relative overflow-hidden font-display px-10 py-5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-400 hover:via-green-400 hover:to-teal-400 disabled:from-gray-600 disabled:to-gray-800 text-white rounded-2xl font-bold transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-xl border border-emerald-400/30"
              >
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-green-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                
                {/* Button content */}
                <div className="relative z-10">
                  {fetcher.state !== "idle" ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/30 border-t-white"></div>
                      <span className="font-bold tracking-wide">Kereskedés küldése...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                      <span className="font-bold tracking-wide">KERESKEDÉS KÜLDÉSE</span>
                      <svg className="w-6 h-6 group-hover:-rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Shine effect */}
                <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:left-[100%] transition-all duration-700 skew-x-12"></div>
              </button>
            </div>
          )}

          {/* Instructions */}
          {!selectedReceiver && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <svg className="w-16 h-16 mx-auto text-neutral-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="font-display text-xl font-semibold text-neutral-300 mb-2">Válassz kereskedési partnert</h3>
                <p className="font-display text-neutral-400">
                  Keress egy játékost fentebb, hogy elkezdd a kereskedést. 
                  Felajánlhatod a saját itemjeidet és kérheted cserébe az övéit.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}