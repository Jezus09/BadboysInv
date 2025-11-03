-- CreateTable
CREATE TABLE "MarketplaceAnnouncement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemRarity" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "announced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceAnnouncement_announced_idx" ON "MarketplaceAnnouncement"("announced");

-- CreateIndex
CREATE INDEX "MarketplaceAnnouncement_createdAt_idx" ON "MarketplaceAnnouncement"("createdAt");
