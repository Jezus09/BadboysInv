/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useState, useEffect } from "react";
import { data, useLoaderData, useRevalidator } from "react-router";
import { requireUser } from "~/auth.server";
import { useUser } from "~/components/app-context";
import { CurrencyDisplay } from "~/components/currency-display";
import { MarketplaceItemCard } from "~/components/marketplace-item-card";
import { MarketplacePurchaseModal } from "~/components/marketplace-purchase-modal";
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
  const user = useUser();
  const revalidator = useRevalidator();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [selectedTab, setSelectedTab] = useState<"all" | "my">("all");

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
        } else {
          const response = await fetch("/api/marketplace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "get_my_listings" })
          });
          const data = await response.json();

          if (data.success && data.listings) {
            setListings(data.listings);
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
                MARKETPLACE
              </h1>
              <div className="absolute inset-0 text-6xl font-black text-purple-400/20 blur-sm">
                MARKETPLACE
              </div>
            </div>

            {/* Description */}
            <div className="mb-4 text-center">
              <p className="font-display text-lg font-medium text-neutral-300">
                Vásárolj és adj el skineket más játékosokkal
              </p>
            </div>

            {/* Balance */}
            <div className="mb-6 flex justify-center">
              {user && (
                <div className="flex items-center gap-3 rounded-lg border border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-4 py-2">
                  <span className="font-semibold text-purple-400">
                    Egyenleg:
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
                Összes hirdetés
              </button>
              <button
                onClick={() => setSelectedTab("my")}
                className={`font-display flex items-center gap-2 px-2 py-1 text-base transition-all hover:bg-black/30 active:bg-black/70 ${
                  selectedTab === "my" ? "bg-black/30" : ""
                }`}
              >
                Saját hirdetéseim
              </button>
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-neutral-400">Betöltés...</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {listings.map((listing) => (
                <MarketplaceItemCard
                  key={listing.id}
                  listing={listing}
                  isOwn={listing.userId === user?.id}
                  onClick={() => setSelectedListing(listing)}
                />
              ))}
            </div>
          )}

          {listings.length === 0 && !loading && (
            <div className="py-12 text-center">
              <h3 className="mb-2 text-xl text-neutral-400">
                {selectedTab === "all"
                  ? "Nincsenek elérhető hirdetések"
                  : "Még nincs aktív hirdetésed"}
              </h3>
              <p className="text-neutral-500">
                {selectedTab === "all"
                  ? "Legyél te az első aki elad valamit!"
                  : "Kezdd el az eladást az inventory-dból!"}
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
