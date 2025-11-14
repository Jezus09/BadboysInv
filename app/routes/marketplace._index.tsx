/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect, useMemo } from "react";
import { data, useLoaderData, useRevalidator } from "react-router";
import { CS2Economy } from "@ianlucas/cs2-lib";
import { requireUser } from "~/auth.server";
import { useUser } from "~/components/app-context";
import { useTranslate } from "~/components/app-context";
import { CurrencyDisplay } from "~/components/currency-display";
import { MarketplaceItemCard } from "~/components/marketplace-item-card";
import { MarketplacePurchaseModal } from "~/components/marketplace-purchase-modal";
import { ECONOMY_ITEM_FILTERS } from "~/utils/economy-filters";
import type { Route } from "./+types/marketplace._index";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return data({});
}

interface MarketplaceListing {
  id: string;
  userId: string;
  itemUid: number;
  itemData: string;
  price: string;
  status: string;
  createdAt: string;
  seller: {
    id: string;
    name: string;
    avatar: string;
  };
}

export default function MarketplacePage() {
  useLoaderData<typeof loader>();
  const translate = useTranslate();
  const user = useUser();
  const revalidator = useRevalidator();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [selectedTab, setSelectedTab] = useState<"all" | "my" | "sold">("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Fetch marketplace listings
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        if (selectedTab === "all") {
          const response = await fetch("/api/marketplace");
          const data = await response.json();

          if (data.listings) {
            setListings(data.listings);
          }
        } else if (selectedTab === "my" || selectedTab === "sold") {
          const response = await fetch("/api/marketplace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "get_my_listings" })
          });
          const data = await response.json();

          if (data.success && data.listings) {
            // Filter based on tab
            if (selectedTab === "my") {
              setListings(data.listings.filter((l: any) => l.status === "ACTIVE"));
            } else {
              setListings(data.listings.filter((l: any) => l.status === "SOLD"));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch marketplace listings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [selectedTab]);

  // Filter listings based on selected weapon type
  const filteredListings = useMemo(() => {
    if (selectedFilter === "all") {
      return listings;
    }

    const filter = ECONOMY_ITEM_FILTERS.find(f => f.label === selectedFilter);
    if (!filter) {
      return listings;
    }

    return listings.filter(listing => {
      try {
        const itemData = JSON.parse(listing.itemData);
        const economyItem = CS2Economy.getById(itemData.id);

        // Check if item type matches filter type
        if (economyItem.type !== filter.type) {
          return false;
        }

        // For weapons, also check category if specified
        if (filter.category && economyItem.category !== filter.category) {
          return false;
        }

        return true;
      } catch (error) {
        console.error("Failed to parse item data:", error);
        return false;
      }
    });
  }, [listings, selectedFilter]);

  const handleRefresh = () => {
    revalidator.revalidate();
    setSelectedListing(null);
  };

  return (
    <>
      <div className="m-auto w-full px-4 lg:w-[1024px] lg:px-0">
        <div className="my-8">
          {/* Header */}
          <div className="mb-8 text-center">
            {/* Marketplace Title */}
            <div className="relative mb-6">
              <h1 className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-6xl font-black text-transparent drop-shadow-2xl">
                {translate("MarketplaceTitle")}
              </h1>
              <div className="absolute inset-0 text-6xl font-black text-purple-400/20 blur-sm">
                {translate("MarketplaceTitle")}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4 text-center">
              <p className="font-display text-lg font-medium text-neutral-300">
                {translate("MarketplaceDescription")}
              </p>
            </div>

            {/* Balance */}
            <div className="mb-6 flex justify-center">
              {user && (
                <div className="flex items-center gap-3 rounded-lg border border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-4 py-2">
                  <span className="font-semibold text-purple-400">
                    {translate("Balance")}
                  </span>
                  <CurrencyDisplay
                    amount={(user as any).coins}
                    className="text-xl font-bold text-purple-300"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setSelectedTab("all")}
                className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                  selectedTab === "all" ? "bg-black/30" : ""
                }`}
              >
                {translate("MarketplaceTabAll")}
              </button>
              <button
                onClick={() => setSelectedTab("my")}
                className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                  selectedTab === "my" ? "bg-black/30" : ""
                }`}
              >
                {translate("MarketplaceTabMine")}
              </button>
              <button
                onClick={() => setSelectedTab("sold")}
                className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                  selectedTab === "sold" ? "bg-black/30" : ""
                }`}
              >
                {translate("MarketplaceTabSold")}
              </button>
            </div>
          </div>

          {/* Weapon Filter */}
          <div className="mb-6">
            <div className="flex justify-center">
              <div className="flex items-center gap-3">
                <label className="font-display text-sm text-neutral-300">
                  {translate("MarketplaceFilterLabel")}
                </label>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="font-display rounded border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-sm text-white transition-colors hover:border-purple-500 focus:border-purple-500 focus:outline-none"
                >
                  <option value="all">{translate("MarketplaceFilterAll")}</option>
                  {ECONOMY_ITEM_FILTERS.map((filter) => (
                    <option key={filter.label} value={filter.label}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-neutral-400">{translate("MarketplaceLoading")}</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredListings.map((listing) => (
                <MarketplaceItemCard
                  key={listing.id}
                  listing={listing}
                  isOwn={listing.userId === user?.id}
                  onClick={() => setSelectedListing(listing)}
                />
              ))}
            </div>
          )}

          {filteredListings.length === 0 && !loading && (
            <div className="py-12 text-center">
              <h3 className="mb-2 text-xl text-neutral-400">
                {selectedFilter !== "all"
                  ? translate("MarketplaceEmptyFilteredType")
                  : selectedTab === "all"
                  ? translate("MarketplaceEmptyAll")
                  : translate("MarketplaceEmptyMine")}
              </h3>
              <p className="text-neutral-500">
                {selectedFilter !== "all"
                  ? translate("MarketplaceEmptySubFilteredType")
                  : selectedTab === "all"
                  ? translate("MarketplaceEmptySubAll")
                  : translate("MarketplaceEmptySubMine")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {selectedListing && (
        <MarketplacePurchaseModal
          listing={selectedListing}
          isOwn={selectedListing.userId === user?.id}
          onClose={handleRefresh}
        />
      )}
    </>
  );
}
