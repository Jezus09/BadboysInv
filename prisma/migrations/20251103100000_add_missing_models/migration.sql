-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "MarketplaceStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: MarketplaceListing
CREATE TABLE IF NOT EXISTS "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemUid" INTEGER NOT NULL,
    "itemData" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "MarketplaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "soldAt" TIMESTAMP(3),
    "buyerId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ItemHistory
CREATE TABLE IF NOT EXISTS "ItemHistory" (
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

-- CreateTable: ItemTransfer
CREATE TABLE IF NOT EXISTS "ItemTransfer" (
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

-- CreateTable: player_stats
CREATE TABLE IF NOT EXISTS "player_stats" (
    "steam_id" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "rank_id" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "kd_ratio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "headshot_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_stats_pkey" PRIMARY KEY ("steam_id")
);

-- CreateTable: ranks
CREATE TABLE IF NOT EXISTS "ranks" (
    "id" SERIAL NOT NULL,
    "rank_name" TEXT NOT NULL,
    "rank_tag" TEXT NOT NULL,
    "min_experience" INTEGER NOT NULL,
    "max_experience" INTEGER NOT NULL,
    "rank_color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: player_admins
CREATE TABLE IF NOT EXISTS "player_admins" (
    "steam_id" TEXT NOT NULL,
    "admin_role" TEXT NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_admins_pkey" PRIMARY KEY ("steam_id")
);

-- CreateTable: player_bans
CREATE TABLE IF NOT EXISTS "player_bans" (
    "id" TEXT NOT NULL,
    "steam_id" TEXT NOT NULL,
    "banned_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "banned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "player_bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: admin_logs
CREATE TABLE IF NOT EXISTS "admin_logs" (
    "id" TEXT NOT NULL,
    "admin_steam_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_steam_id" TEXT,
    "action_details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CaseOpeningMessage
CREATE TABLE IF NOT EXISTS "CaseOpeningMessage" (
    "id" TEXT NOT NULL,
    "caseOpeningId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userAvatar" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseOpeningMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketplaceListing_userId_idx" ON "MarketplaceListing"("userId");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_status_idx" ON "MarketplaceListing"("status");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_createdAt_idx" ON "MarketplaceListing"("createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_price_idx" ON "MarketplaceListing"("price");

CREATE UNIQUE INDEX IF NOT EXISTS "ItemHistory_itemUuid_key" ON "ItemHistory"("itemUuid");
CREATE INDEX IF NOT EXISTS "ItemHistory_itemUuid_idx" ON "ItemHistory"("itemUuid");
CREATE INDEX IF NOT EXISTS "ItemHistory_currentOwner_idx" ON "ItemHistory"("currentOwner");
CREATE INDEX IF NOT EXISTS "ItemHistory_createdBy_idx" ON "ItemHistory"("createdBy");
CREATE INDEX IF NOT EXISTS "ItemHistory_createdAt_idx" ON "ItemHistory"("createdAt");

CREATE INDEX IF NOT EXISTS "ItemTransfer_itemUuid_idx" ON "ItemTransfer"("itemUuid");
CREATE INDEX IF NOT EXISTS "ItemTransfer_fromUser_idx" ON "ItemTransfer"("fromUser");
CREATE INDEX IF NOT EXISTS "ItemTransfer_toUser_idx" ON "ItemTransfer"("toUser");
CREATE INDEX IF NOT EXISTS "ItemTransfer_timestamp_idx" ON "ItemTransfer"("timestamp");
CREATE INDEX IF NOT EXISTS "ItemTransfer_transferType_idx" ON "ItemTransfer"("transferType");

CREATE INDEX IF NOT EXISTS "player_stats_rank_id_idx" ON "player_stats"("rank_id");
CREATE INDEX IF NOT EXISTS "player_stats_experience_idx" ON "player_stats"("experience");
CREATE INDEX IF NOT EXISTS "player_stats_kills_idx" ON "player_stats"("kills");

CREATE UNIQUE INDEX IF NOT EXISTS "ranks_rank_name_key" ON "ranks"("rank_name");
CREATE INDEX IF NOT EXISTS "ranks_min_experience_idx" ON "ranks"("min_experience");

CREATE INDEX IF NOT EXISTS "player_admins_is_active_idx" ON "player_admins"("is_active");

CREATE INDEX IF NOT EXISTS "player_bans_steam_id_idx" ON "player_bans"("steam_id");
CREATE INDEX IF NOT EXISTS "player_bans_is_active_idx" ON "player_bans"("is_active");
CREATE INDEX IF NOT EXISTS "player_bans_banned_at_idx" ON "player_bans"("banned_at");

CREATE INDEX IF NOT EXISTS "admin_logs_admin_steam_id_idx" ON "admin_logs"("admin_steam_id");
CREATE INDEX IF NOT EXISTS "admin_logs_action_type_idx" ON "admin_logs"("action_type");
CREATE INDEX IF NOT EXISTS "admin_logs_created_at_idx" ON "admin_logs"("created_at");

CREATE INDEX IF NOT EXISTS "CaseOpeningMessage_caseOpeningId_idx" ON "CaseOpeningMessage"("caseOpeningId");
CREATE INDEX IF NOT EXISTS "CaseOpeningMessage_userId_idx" ON "CaseOpeningMessage"("userId");
CREATE INDEX IF NOT EXISTS "CaseOpeningMessage_createdAt_idx" ON "CaseOpeningMessage"("createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ItemTransfer" ADD CONSTRAINT "ItemTransfer_itemUuid_fkey"
        FOREIGN KEY ("itemUuid") REFERENCES "ItemHistory"("itemUuid") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_rank_id_fkey"
        FOREIGN KEY ("rank_id") REFERENCES "ranks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CaseOpeningMessage" ADD CONSTRAINT "CaseOpeningMessage_caseOpeningId_fkey"
        FOREIGN KEY ("caseOpeningId") REFERENCES "CaseOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "CaseOpeningMessage" ADD CONSTRAINT "CaseOpeningMessage_replyToId_fkey"
        FOREIGN KEY ("replyToId") REFERENCES "CaseOpeningMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
