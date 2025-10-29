/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PrismaClient } from "@prisma/client";

// K4System PostgreSQL connection
// Uses the same PostgreSQL server as inventory, just different database
const DATABASE_URL = process.env.DATABASE_URL || "";
const K4_DATABASE_URL = DATABASE_URL.replace("/inventory", "/k4system");

const k4Prisma = new PrismaClient({
  datasources: {
    db: {
      url: K4_DATABASE_URL
    }
  }
});

export interface K4PlayerStats {
  // Player info
  steamId: string;
  playerName: string;

  // Stats from k4_stats
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  mvps: number;
  bombPlanted: number;
  bombDefused: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;

  // Calculated stats
  kd: number;
  headshotPercentage: number;
  accuracy: number;
  winRate: number;

  // Rank from k4_ranks
  rankName: string | null;
  rankPoints: number;

  // Time from k4_times
  playtime: number; // in seconds
  playtimeFormatted: string;
  lastConnect: Date | null;
}

/**
 * Get K4System statistics for a player by Steam ID
 */
export async function getK4PlayerStats(steamId: string): Promise<K4PlayerStats | null> {
  try {
    // Query all K4 tables using raw SQL since we don't have Prisma schema for k4system
    const result = await k4Prisma.$queryRaw<any[]>`
      SELECT
        p.steam_id,
        p.player_name,
        COALESCE(s.kills, 0) as kills,
        COALESCE(s.deaths, 0) as deaths,
        COALESCE(s.assists, 0) as assists,
        COALESCE(s.headshots, 0) as headshots,
        COALESCE(s.rounds_played, 0) as rounds_played,
        COALESCE(s.rounds_won, 0) as rounds_won,
        COALESCE(s.rounds_lost, 0) as rounds_lost,
        COALESCE(s.mvps, 0) as mvps,
        COALESCE(s.bomb_planted, 0) as bomb_planted,
        COALESCE(s.bomb_defused, 0) as bomb_defused,
        COALESCE(s.damage_dealt, 0) as damage_dealt,
        COALESCE(s.shots_fired, 0) as shots_fired,
        COALESCE(s.shots_hit, 0) as shots_hit,
        r.rank_name,
        COALESCE(r.points, 0) as rank_points,
        COALESCE(t.playtime, 0) as playtime,
        t.last_connect
      FROM k4_players p
      LEFT JOIN k4_stats s ON p.steam_id = s.steam_id
      LEFT JOIN k4_ranks r ON p.steam_id = r.steam_id
      LEFT JOIN k4_times t ON p.steam_id = t.steam_id
      WHERE p.steam_id = ${steamId}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return null;
    }

    const data = result[0];

    // Calculate derived stats
    const kills = Number(data.kills) || 0;
    const deaths = Number(data.deaths) || 0;
    const headshots = Number(data.headshots) || 0;
    const shotsFired = Number(data.shots_fired) || 0;
    const shotsHit = Number(data.shots_hit) || 0;
    const roundsWon = Number(data.rounds_won) || 0;
    const roundsPlayed = Number(data.rounds_played) || 0;

    const kd = deaths > 0 ? kills / deaths : kills;
    const headshotPercentage = kills > 0 ? (headshots / kills) * 100 : 0;
    const accuracy = shotsFired > 0 ? (shotsHit / shotsFired) * 100 : 0;
    const winRate = roundsPlayed > 0 ? (roundsWon / roundsPlayed) * 100 : 0;

    // Format playtime
    const playtimeSeconds = Number(data.playtime) || 0;
    const hours = Math.floor(playtimeSeconds / 3600);
    const minutes = Math.floor((playtimeSeconds % 3600) / 60);
    const playtimeFormatted = `${hours}h ${minutes}m`;

    return {
      steamId: data.steam_id,
      playerName: data.player_name,
      kills,
      deaths,
      assists: Number(data.assists) || 0,
      headshots,
      roundsPlayed,
      roundsWon,
      roundsLost: Number(data.rounds_lost) || 0,
      mvps: Number(data.mvps) || 0,
      bombPlanted: Number(data.bomb_planted) || 0,
      bombDefused: Number(data.bomb_defused) || 0,
      damageDealt: Number(data.damage_dealt) || 0,
      shotsFired,
      shotsHit,
      kd: Math.round(kd * 100) / 100,
      headshotPercentage: Math.round(headshotPercentage * 10) / 10,
      accuracy: Math.round(accuracy * 10) / 10,
      winRate: Math.round(winRate * 10) / 10,
      rankName: data.rank_name || null,
      rankPoints: Number(data.rank_points) || 0,
      playtime: playtimeSeconds,
      playtimeFormatted,
      lastConnect: data.last_connect ? new Date(data.last_connect) : null
    };
  } catch (error) {
    console.error("[K4System] Error fetching player stats:", error);
    return null;
  }
}

/**
 * Get top players by kills
 */
export async function getTopPlayersByKills(limit: number = 10) {
  try {
    const result = await k4Prisma.$queryRaw<any[]>`
      SELECT
        p.steam_id,
        p.player_name,
        s.kills,
        s.deaths,
        CASE WHEN s.deaths > 0 THEN ROUND(s.kills::numeric / s.deaths::numeric, 2) ELSE s.kills END as kd
      FROM k4_players p
      INNER JOIN k4_stats s ON p.steam_id = s.steam_id
      ORDER BY s.kills DESC
      LIMIT ${limit}
    `;

    return result.map((row) => ({
      steamId: row.steam_id,
      playerName: row.player_name,
      kills: Number(row.kills),
      deaths: Number(row.deaths),
      kd: Number(row.kd)
    }));
  } catch (error) {
    console.error("[K4System] Error fetching top players:", error);
    return [];
  }
}
