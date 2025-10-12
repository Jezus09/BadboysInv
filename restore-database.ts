import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function restoreDatabase(backupFile?: string) {
  console.log('🔄 Adatbázis visszaállítása...');
  
  try {
    // Determine backup file
    const backupDir = 'backups';
    const filepath = backupFile || join(backupDir, 'latest-backup.json');
    
    if (!existsSync(filepath)) {
      throw new Error(`Backup fájl nem található: ${filepath}`);
    }
    
    console.log(`📁 Backup betöltése: ${filepath}`);
    const backupData = JSON.parse(readFileSync(filepath, 'utf-8'));
    
    console.log(`📅 Backup időpont: ${backupData.timestamp}`);
    console.log(`📊 Backup tartalma:`);
    console.log(`   - Shop itemek: ${backupData.counts?.shopItems || backupData.shopItems?.length || 0}`);
    console.log(`   - Rules: ${backupData.counts?.rules || backupData.rules?.length || 0}`);
    console.log(`   - Users: ${backupData.counts?.users || backupData.users?.length || 0}`);
    
    // Clear existing data
    console.log('🗑️ Meglévő adatok törlése...');
    await prisma.shopItem.deleteMany({});
    await prisma.rule.deleteMany({});
    
    // Restore ShopItems
    if (backupData.shopItems && backupData.shopItems.length > 0) {
      console.log('📦 Shop itemek visszaállítása...');
      for (const item of backupData.shopItems) {
        await prisma.shopItem.create({
          data: {
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            itemId: item.itemId,
            enabled: item.enabled,
            sortOrder: item.sortOrder
          }
        });
      }
      console.log(`✅ ${backupData.shopItems.length} shop item visszaállítva`);
    }
    
    // Restore Rules
    if (backupData.rules && backupData.rules.length > 0) {
      console.log('⚙️ Rules visszaállítása...');
      for (const rule of backupData.rules) {
        await prisma.rule.create({
          data: {
            name: rule.name,
            type: rule.type,
            value: rule.value
          }
        });
      }
      console.log(`✅ ${backupData.rules.length} rule visszaállítva`);
    }
    
    // Note: Users are backed up but not restored automatically to avoid conflicts
    console.log('👥 Users backup-olva van, de nem állítjuk vissza automatikusan');
    
    console.log('✅ Adatbázis sikeresen visszaállítva!');
    
    return backupData;
    
  } catch (error) {
    console.error('❌ Restore hiba:', error);
    throw error;
  }
}

// Ha közvetlenül futtatjuk
if (process.argv[1].includes('restore-database.ts')) {
  const backupFile = process.argv[2];
  restoreDatabase(backupFile).finally(() => prisma.$disconnect());
}

export { restoreDatabase };