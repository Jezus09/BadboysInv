/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { prisma } from "~/db.server";

export interface PlayerStatsData {
  steamId: string;
  playerName: string;
  rankId: number;
  rankName: string;
  rankTag: string;
  rankColor: string;
  experience: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  headshotPercentage: number;
  minExperience: number;
  maxExperience: number;
}

/**
 * Get player stats by Steam ID
 */
export async function getPlayerStats(steamId: string): Promise<PlayerStatsData | null> {
  try {
    const stats = await prisma.playerStats.findUnique({
      where: { steamId },
      include: {
        rank: true
      }
    });

    if (!stats) {
      return null;
    }

    return {
      steamId: stats.steamId,
      playerName: stats.playerName,
      rankId: stats.rankId,
      rankName: stats.rank.rankName,
      rankTag: stats.rank.rankTag,
      rankColor: stats.rank.rankColor,
      experience: stats.experience,
      kills: stats.kills,
      deaths: stats.deaths,
      kdRatio: stats.kdRatio,
      headshotPercentage: stats.headshotPercentage,
      minExperience: stats.rank.minExperience,
      maxExperience: stats.rank.maxExperience
    };
  } catch (error) {
    console.error("[RankSystem] Error fetching player stats:", error);
    return null;
  }
}

/**
 * Get leaderboard by type
 */
export async function getLeaderboard(type: "rank" | "kills" | "kd", limit: number = 100) {
  try {
    let orderBy: any = { experience: "desc" };

    if (type === "kills") {
      orderBy = { kills: "desc" };
    } else if (type === "kd") {
      orderBy = { kdRatio: "desc" };
    }

    const players = await prisma.playerStats.findMany({
      take: limit,
      orderBy,
      include: {
        rank: true
      }
    });

    return players.map((player, index) => ({
      position: index + 1,
      steamId: player.steamId,
      playerName: player.playerName,
      rankName: player.rank.rankName,
      rankTag: player.rank.rankTag,
      rankColor: player.rank.rankColor,
      experience: player.experience,
      kills: player.kills,
      deaths: player.deaths,
      kdRatio: player.kdRatio,
      headshotPercentage: player.headshotPercentage
    }));
  } catch (error) {
    console.error("[RankSystem] Error fetching leaderboard:", error);
    return [];
  }
}

/**
 * Get all ranks
 */
export async function getAllRanks() {
  try {
    const ranks = await prisma.rank.findMany({
      orderBy: { minExperience: "asc" }
    });

    // Get player count for each rank
    const ranksWithCounts = await Promise.all(
      ranks.map(async (rank) => {
        const playerCount = await prisma.playerStats.count({
          where: { rankId: rank.id }
        });

        return {
          id: rank.id,
          rankName: rank.rankName,
          rankTag: rank.rankTag,
          minExperience: rank.minExperience,
          maxExperience: rank.maxExperience,
          rankColor: rank.rankColor,
          playerCount
        };
      })
    );

    return ranksWithCounts;
  } catch (error) {
    console.error("[RankSystem] Error fetching ranks:", error);
    return [];
  }
}

/**
 * Update or create player stats
 */
export async function upsertPlayerStats(data: {
  steamId: string;
  playerName: string;
  kills?: number;
  deaths?: number;
  experience?: number;
}) {
  try {
    const { steamId, playerName, kills = 0, deaths = 0, experience = 0 } = data;

    // Calculate K/D ratio and headshot percentage
    const kdRatio = deaths > 0 ? kills / deaths : kills;

    // Find appropriate rank based on experience
    const rank = await prisma.rank.findFirst({
      where: {
        minExperience: { lte: experience },
        maxExperience: { gte: experience }
      }
    });

    if (!rank) {
      throw new Error("No rank found for experience: " + experience);
    }

    const stats = await prisma.playerStats.upsert({
      where: { steamId },
      update: {
        playerName,
        kills,
        deaths,
        kdRatio,
        experience,
        rankId: rank.id
      },
      create: {
        steamId,
        playerName,
        kills,
        deaths,
        kdRatio,
        headshotPercentage: 0,
        experience,
        rankId: rank.id
      }
    });

    return stats;
  } catch (error) {
    console.error("[RankSystem] Error upserting player stats:", error);
    throw error;
  }
}

/**
 * Check if player is admin
 */
export async function isPlayerAdmin(steamId: string): Promise<boolean> {
  try {
    const admin = await prisma.playerAdmin.findUnique({
      where: { steamId, isActive: true }
    });
    return !!admin;
  } catch (error) {
    console.error("[RankSystem] Error checking admin status:", error);
    return false;
  }
}

/**
 * Get admin info
 */
export async function getAdminInfo(steamId: string) {
  try {
    return await prisma.playerAdmin.findUnique({
      where: { steamId, isActive: true }
    });
  } catch (error) {
    console.error("[RankSystem] Error fetching admin info:", error);
    return null;
  }
}

/**
 * Get all admins
 */
export async function getAllAdmins() {
  try {
    return await prisma.playerAdmin.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("[RankSystem] Error fetching admins:", error);
    return [];
  }
}

/**
 * Add admin
 */
export async function addAdmin(data: {
  steamId: string;
  adminRole: string;
  flags: string;
}) {
  try {
    return await prisma.playerAdmin.create({
      data: {
        steamId: data.steamId,
        adminRole: data.adminRole,
        flags: data.flags,
        isActive: true
      }
    });
  } catch (error) {
    console.error("[RankSystem] Error adding admin:", error);
    throw error;
  }
}

/**
 * Ban player
 */
export async function banPlayer(data: {
  steamId: string;
  bannedBy: string;
  reason: string;
  expiresAt?: Date;
}) {
  try {
    const ban = await prisma.playerBan.create({
      data: {
        steamId: data.steamId,
        bannedBy: data.bannedBy,
        reason: data.reason,
        expiresAt: data.expiresAt,
        isActive: true
      }
    });

    // Log the action
    await logAdminAction({
      adminSteamId: data.bannedBy,
      actionType: "BAN",
      targetSteamId: data.steamId,
      actionDetails: `Reason: ${data.reason}, Expires: ${data.expiresAt || "Never"}`
    });

    return ban;
  } catch (error) {
    console.error("[RankSystem] Error banning player:", error);
    throw error;
  }
}

/**
 * Unban player
 */
export async function unbanPlayer(steamId: string, adminSteamId: string) {
  try {
    await prisma.playerBan.updateMany({
      where: { steamId, isActive: true },
      data: { isActive: false }
    });

    // Log the action
    await logAdminAction({
      adminSteamId,
      actionType: "UNBAN",
      targetSteamId: steamId
    });

    return true;
  } catch (error) {
    console.error("[RankSystem] Error unbanning player:", error);
    throw error;
  }
}

/**
 * Get all active bans
 */
export async function getActiveBans() {
  try {
    return await prisma.playerBan.findMany({
      where: { isActive: true },
      orderBy: { bannedAt: "desc" }
    });
  } catch (error) {
    console.error("[RankSystem] Error fetching bans:", error);
    return [];
  }
}

/**
 * Give XP to player
 */
export async function givePlayerXP(steamId: string, xpAmount: number, adminSteamId: string) {
  try {
    const stats = await prisma.playerStats.findUnique({
      where: { steamId }
    });

    if (!stats) {
      throw new Error("Player not found");
    }

    const newExperience = stats.experience + xpAmount;

    // Find new rank
    const rank = await prisma.rank.findFirst({
      where: {
        minExperience: { lte: newExperience },
        maxExperience: { gte: newExperience }
      }
    });

    if (!rank) {
      throw new Error("No rank found for new experience");
    }

    await prisma.playerStats.update({
      where: { steamId },
      data: {
        experience: newExperience,
        rankId: rank.id
      }
    });

    // Log the action
    await logAdminAction({
      adminSteamId,
      actionType: "GIVE_XP",
      targetSteamId: steamId,
      actionDetails: `XP: ${xpAmount}, New Total: ${newExperience}`
    });

    return true;
  } catch (error) {
    console.error("[RankSystem] Error giving XP:", error);
    throw error;
  }
}

/**
 * Get all players
 */
export async function getAllPlayers(limit: number = 1000) {
  try {
    return await prisma.playerStats.findMany({
      take: limit,
      orderBy: { experience: "desc" },
      include: {
        rank: true
      }
    });
  } catch (error) {
    console.error("[RankSystem] Error fetching players:", error);
    return [];
  }
}

/**
 * Log admin action
 */
export async function logAdminAction(data: {
  adminSteamId: string;
  actionType: string;
  targetSteamId?: string;
  actionDetails?: string;
}) {
  try {
    await prisma.adminLog.create({
      data: {
        adminSteamId: data.adminSteamId,
        actionType: data.actionType,
        targetSteamId: data.targetSteamId,
        actionDetails: data.actionDetails
      }
    });
  } catch (error) {
    console.error("[RankSystem] Error logging admin action:", error);
  }
}

/**
 * Get admin logs
 */
export async function getAdminLogs(limit: number = 100) {
  try {
    return await prisma.adminLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("[RankSystem] Error fetching admin logs:", error);
    return [];
  }
}
