-- CreateTable
CREATE TABLE "ItemHistory" (
    "id" TEXT NOT NULL,
    "itemUuid" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "wear" DOUBLE PRECISION,
    "seed" INTEGER,
    "nameTag" TEXT,
    "stickers" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "currentOwner" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ItemHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTransfer" (
    "id" TEXT NOT NULL,
    "itemUuid" TEXT NOT NULL,
    "fromUser" TEXT,
    "toUser" TEXT NOT NULL,
    "transferType" TEXT NOT NULL,
    "tradeId" TEXT,
    "listingId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "ItemTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemHistory_itemUuid_key" ON "ItemHistory"("itemUuid");

-- CreateIndex
CREATE INDEX "ItemHistory_itemUuid_idx" ON "ItemHistory"("itemUuid");

-- CreateIndex
CREATE INDEX "ItemHistory_currentOwner_idx" ON "ItemHistory"("currentOwner");

-- CreateIndex
CREATE INDEX "ItemHistory_createdBy_idx" ON "ItemHistory"("createdBy");

-- CreateIndex
CREATE INDEX "ItemHistory_createdAt_idx" ON "ItemHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ItemTransfer_itemUuid_idx" ON "ItemTransfer"("itemUuid");

-- CreateIndex
CREATE INDEX "ItemTransfer_fromUser_idx" ON "ItemTransfer"("fromUser");

-- CreateIndex
CREATE INDEX "ItemTransfer_toUser_idx" ON "ItemTransfer"("toUser");

-- CreateIndex
CREATE INDEX "ItemTransfer_timestamp_idx" ON "ItemTransfer"("timestamp");

-- CreateIndex
CREATE INDEX "ItemTransfer_transferType_idx" ON "ItemTransfer"("transferType");

-- AddForeignKey
ALTER TABLE "ItemTransfer" ADD CONSTRAINT "ItemTransfer_itemUuid_fkey" FOREIGN KEY ("itemUuid") REFERENCES "ItemHistory"("itemUuid") ON DELETE CASCADE ON UPDATE CASCADE;
