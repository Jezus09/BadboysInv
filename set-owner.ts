// Owner Steam ID beállítása
// Használat: npx tsx set-owner.ts YOUR_STEAM_ID

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setOwner() {
  const STEAM_ID = process.argv[2];
  
  if (!STEAM_ID) {
    console.log("Használat: npx tsx set-owner.ts YOUR_STEAM_ID");
    console.log("Példa: npx tsx set-owner.ts 76561198123456789");
    return;
  }
  
  console.log("Steam ID beállítása:", STEAM_ID);
  
  try {
    // Beállítjuk az owner szabályt a Rule táblában
    await prisma.rule.upsert({
      where: {
        name: "ownerSteamId"
      },
      update: {
        value: STEAM_ID
      },
      create: {
        name: "ownerSteamId",
        value: STEAM_ID
      }
    });
    
    console.log("✅ Owner Steam ID sikeresen beállítva:", STEAM_ID);
    
    // Ellenőrizzük hogy sikerült-e
    const rule = await prisma.rule.findUnique({
      where: { name: "ownerSteamId" }
    });
    
    console.log("✅ Jelenlegi owner szabály:", rule);
    
  } catch (error) {
    console.error("❌ Hiba történt:", error);
  }
}

setOwner().finally(() => prisma.$disconnect());