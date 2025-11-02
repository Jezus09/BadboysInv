-- CreateTable
CREATE TABLE "ranks" (
    "id" SERIAL NOT NULL,
    "rank_name" TEXT NOT NULL,
    "rank_tag" TEXT NOT NULL,
    "min_experience" INTEGER NOT NULL,
    "max_experience" INTEGER NOT NULL,
    "rank_color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_stats" (
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

-- CreateTable
CREATE TABLE "player_admins" (
    "steam_id" TEXT NOT NULL,
    "admin_role" TEXT NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_admins_pkey" PRIMARY KEY ("steam_id")
);

-- CreateTable
CREATE TABLE "player_bans" (
    "id" TEXT NOT NULL,
    "steam_id" TEXT NOT NULL,
    "banned_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "banned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "player_bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" TEXT NOT NULL,
    "admin_steam_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_steam_id" TEXT,
    "action_details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ranks_rank_name_key" ON "ranks"("rank_name");

-- CreateIndex
CREATE INDEX "ranks_min_experience_idx" ON "ranks"("min_experience");

-- CreateIndex
CREATE INDEX "player_stats_rank_id_idx" ON "player_stats"("rank_id");

-- CreateIndex
CREATE INDEX "player_stats_experience_idx" ON "player_stats"("experience");

-- CreateIndex
CREATE INDEX "player_stats_kills_idx" ON "player_stats"("kills");

-- CreateIndex
CREATE INDEX "player_admins_is_active_idx" ON "player_admins"("is_active");

-- CreateIndex
CREATE INDEX "player_bans_steam_id_idx" ON "player_bans"("steam_id");

-- CreateIndex
CREATE INDEX "player_bans_is_active_idx" ON "player_bans"("is_active");

-- CreateIndex
CREATE INDEX "player_bans_banned_at_idx" ON "player_bans"("banned_at");

-- CreateIndex
CREATE INDEX "admin_logs_admin_steam_id_idx" ON "admin_logs"("admin_steam_id");

-- CreateIndex
CREATE INDEX "admin_logs_action_type_idx" ON "admin_logs"("action_type");

-- CreateIndex
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs"("created_at");

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_rank_id_fkey" FOREIGN KEY ("rank_id") REFERENCES "ranks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
