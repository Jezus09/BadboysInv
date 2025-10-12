import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function restoreDatabase(backupFilePath) {
  console.log('🔄 Adatbázis visszaállítása...');
  
  try {
    const backupData = JSON.parse(readFileSync(backupFilePath, 'utf8'));

    // Delete all existing data
    console.log('🗑️ Régi adatok törlése...');
    await prisma.userRule.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.userCache.deleteMany();
    await prisma.apiAuthToken.deleteMany();
    await prisma.user.deleteMany();

    // Restore users
    console.log('👥 Felhasználók visszaállítása...');
    if (backupData.users && backupData.users.length > 0) {
      for (const user of backupData.users) {
        await prisma.user.create({
          data: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            inventory: user.inventory,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
            syncedAt: new Date(user.syncedAt || user.createdAt),
            coins: user.coins || 0
          }
        });
      }
    }

    console.log('✅ Adatbázis visszaállítása sikeres!');
  } catch (error) {
    console.error('❌ Hiba történt:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('❌ Nincs megadva backup fájl!');
  process.exit(1);
}

restoreDatabase(backupFile);