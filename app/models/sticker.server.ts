import { prisma } from "~/db.server";

interface StickerData {
  id: string;
  name: string;
  description?: string | null;
  rarityId?: string | null;
  rarityName?: string | null;
  rarityColor?: string | null;
  type?: string | null;
  effect?: string | null;
  tournamentId?: number | null;
  tournamentName?: string | null;
  imageUrl: string;
  marketHashName?: string | null;
}

/**
 * Create or update a sticker in the database
 */
export async function upsertSticker(data: StickerData) {
  return await prisma.sticker.upsert({
    where: { id: data.id },
    create: data,
    update: {
      name: data.name,
      description: data.description,
      rarityId: data.rarityId,
      rarityName: data.rarityName,
      rarityColor: data.rarityColor,
      type: data.type,
      effect: data.effect,
      tournamentId: data.tournamentId,
      tournamentName: data.tournamentName,
      imageUrl: data.imageUrl,
      marketHashName: data.marketHashName,
    },
  });
}

/**
 * Get sticker by ID
 */
export async function getSticker(stickerId: string) {
  return await prisma.sticker.findUnique({
    where: { id: stickerId },
  });
}

/**
 * Get all stickers with optional filters
 */
export async function getStickers(filters?: {
  type?: string;
  effect?: string;
  tournamentId?: number;
}) {
  return await prisma.sticker.findMany({
    where: {
      ...(filters?.type && { type: filters.type }),
      ...(filters?.effect && { effect: filters.effect }),
      ...(filters?.tournamentId && { tournamentId: filters.tournamentId }),
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Create a weapon instance
 */
export async function createWeaponInstance(data: {
  userId: string;
  weaponDefIndex: number;
  weaponName: string;
  weaponId: string;
  skinId?: number;
  wear?: number;
  seed?: number;
  itemUuid?: string;
}) {
  return await prisma.userWeaponInstance.create({
    data,
  });
}

/**
 * Get weapon instance by ID
 */
export async function getWeaponInstance(weaponId: string) {
  return await prisma.userWeaponInstance.findUnique({
    where: { id: weaponId },
    include: {
      stickers: {
        include: {
          sticker: true,
        },
        orderBy: { slot: "asc" },
      },
    },
  });
}

/**
 * Get all weapon instances for a user
 */
export async function getUserWeaponInstances(userId: string) {
  return await prisma.userWeaponInstance.findMany({
    where: { userId },
    include: {
      stickers: {
        include: {
          sticker: true,
        },
        orderBy: { slot: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Add a sticker to a weapon
 */
export async function addWeaponSticker(data: {
  weaponId: string;
  stickerId: string;
  slot: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scale?: number;
  wear?: number;
}) {
  // Check if slot is already taken
  const existingSticker = await prisma.weaponSticker.findUnique({
    where: {
      weaponId_slot: {
        weaponId: data.weaponId,
        slot: data.slot,
      },
    },
  });

  if (existingSticker) {
    throw new Error(`Slot ${data.slot} is already occupied on this weapon`);
  }

  // Verify weapon exists
  const weapon = await prisma.userWeaponInstance.findUnique({
    where: { id: data.weaponId },
  });

  if (!weapon) {
    throw new Error("Weapon not found");
  }

  // Verify sticker exists
  const sticker = await prisma.sticker.findUnique({
    where: { id: data.stickerId },
  });

  if (!sticker) {
    throw new Error("Sticker not found");
  }

  return await prisma.weaponSticker.create({
    data: {
      weaponId: data.weaponId,
      stickerId: data.stickerId,
      slot: data.slot,
      positionX: data.positionX,
      positionY: data.positionY,
      positionZ: data.positionZ,
      rotationX: data.rotationX ?? 0,
      rotationY: data.rotationY ?? 0,
      rotationZ: data.rotationZ ?? 0,
      scale: data.scale ?? 1.0,
      wear: data.wear ?? 0,
    },
    include: {
      sticker: true,
    },
  });
}

/**
 * Update a sticker's position/rotation/scale on a weapon
 */
export async function updateWeaponSticker(
  weaponId: string,
  slot: number,
  updates: {
    positionX?: number;
    positionY?: number;
    positionZ?: number;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
    scale?: number;
    wear?: number;
  }
) {
  return await prisma.weaponSticker.update({
    where: {
      weaponId_slot: {
        weaponId,
        slot,
      },
    },
    data: updates,
    include: {
      sticker: true,
    },
  });
}

/**
 * Remove a sticker from a weapon
 */
export async function removeWeaponSticker(weaponId: string, slot: number) {
  return await prisma.weaponSticker.delete({
    where: {
      weaponId_slot: {
        weaponId,
        slot,
      },
    },
  });
}

/**
 * Get all stickers on a weapon
 */
export async function getWeaponStickers(weaponId: string) {
  return await prisma.weaponSticker.findMany({
    where: { weaponId },
    include: {
      sticker: true,
    },
    orderBy: { slot: "asc" },
  });
}
