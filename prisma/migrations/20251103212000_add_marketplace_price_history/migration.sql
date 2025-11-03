-- CreateTable
CREATE TABLE "MarketplacePriceHistory" (
    "id" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "wear" DOUBLE PRECISION,
    "price" DECIMAL(10,2) NOT NULL,
    "listingId" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplacePriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplacePriceHistory_itemId_createdAt_idx" ON "MarketplacePriceHistory"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplacePriceHistory_itemId_wear_createdAt_idx" ON "MarketplacePriceHistory"("itemId", "wear", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplacePriceHistory_createdAt_idx" ON "MarketplacePriceHistory"("createdAt");
