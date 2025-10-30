-- K4System Database Setup Migration
-- This script sets up the K4System database structure for CS2 server statistics
-- Run this after a database reset to recreate all K4System tables

-- ===========================================
-- K4_PLAYERS TABLE
-- Stores basic player information
-- ===========================================
CREATE TABLE IF NOT EXISTS k4_players (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(64) NOT NULL UNIQUE,
    player_name VARCHAR(128),
    first_seen TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    server_id INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_players_steam_id ON k4_players(steam_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_steam_id ON k4_players(steam_id);

-- ===========================================
-- K4_STATS TABLE
-- Stores player combat statistics
-- ===========================================
CREATE TABLE IF NOT EXISTS k4_stats (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(64) NOT NULL,
    server_id INTEGER DEFAULT 1,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    headshots INTEGER DEFAULT 0,
    rounds_played INTEGER DEFAULT 0,
    rounds_won INTEGER DEFAULT 0,
    rounds_lost INTEGER DEFAULT 0,
    mvps INTEGER DEFAULT 0,
    bomb_planted INTEGER DEFAULT 0,
    bomb_defused INTEGER DEFAULT 0,
    hostages_rescued INTEGER DEFAULT 0,
    damage_dealt INTEGER DEFAULT 0,
    shots_fired INTEGER DEFAULT 0,
    shots_hit INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (steam_id) REFERENCES k4_players(steam_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stats_steam_id ON k4_stats(steam_id);
CREATE INDEX IF NOT EXISTS idx_stats_kills ON k4_stats(kills DESC);

-- ===========================================
-- K4_RANKS TABLE
-- Stores player ranking information
-- ===========================================
CREATE TABLE IF NOT EXISTS k4_ranks (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(64) NOT NULL,
    server_id INTEGER DEFAULT 1,
    points INTEGER DEFAULT 0,
    rank_id INTEGER DEFAULT 0,
    rank_name VARCHAR(64),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (steam_id) REFERENCES k4_players(steam_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ranks_steam_id ON k4_ranks(steam_id);
CREATE INDEX IF NOT EXISTS idx_ranks_points ON k4_ranks(points DESC);

-- ===========================================
-- K4_TIMES TABLE
-- Stores player playtime information
-- ===========================================
CREATE TABLE IF NOT EXISTS k4_times (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(64) NOT NULL,
    server_id INTEGER DEFAULT 1,
    playtime INTEGER DEFAULT 0,
    afk_time INTEGER DEFAULT 0,
    last_connect TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_disconnect TIMESTAMP WITHOUT TIME ZONE,
    FOREIGN KEY (steam_id) REFERENCES k4_players(steam_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_times_steam_id ON k4_times(steam_id);

-- ===========================================
-- K4_VIPS TABLE
-- Stores VIP player information
-- ===========================================
CREATE TABLE IF NOT EXISTS k4_vips (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(64) NOT NULL,
    server_id INTEGER DEFAULT 1,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    granted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(64),
    FOREIGN KEY (steam_id) REFERENCES k4_players(steam_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vips_steam_id ON k4_vips(steam_id);

-- ===========================================
-- K4_ROUND_STATS TABLE
-- Stores per-round statistics
-- ===========================================
CREATE TABLE IF NOT EXISTS k4_round_stats (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(64) NOT NULL,
    server_id INTEGER DEFAULT 1,
    round_number INTEGER,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    damage_dealt INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (steam_id) REFERENCES k4_players(steam_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_round_stats_steam_id ON k4_round_stats(steam_id);

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO k4user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO k4user;

-- ===========================================
-- VERIFICATION QUERY
-- ===========================================
-- Run this to verify all tables were created:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
