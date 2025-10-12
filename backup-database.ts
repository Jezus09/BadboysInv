import { PrismaClient } from '@prisma/client';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('🔄 Adatbázis mentése...');
  
  try {
    // Backup timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = 'backups';
    
    // Backup ShopItems
    console.log('📦 Shop itemek mentése...');
    const shopItems = await prisma.shopItem.findMany();
    
    // Backup Rules (owner settings)
    console.log('⚙️ Rules mentése...');
    const rules = await prisma.rule.findMany();
    
    // Backup Users (csak a names és ids)
    console.log('👥 Users mentése...');
    const users = await prisma.user.findMany();
    
    // Create backup object
    const backup = {
      timestamp,
      shopItems,
      rules,
      users,
      counts: {
        shopItems: shopItems.length,
        rules: rules.length,
        users: users.length
      }
    };
    
    // Save to file
    const filename = `backup-${timestamp}.json`;
    const filepath = join(backupDir, filename);
    
    // Create backups directory if it doesn't exist
    if (!existsSync(backupDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(backupDir, { recursive: true });
    }
    
    writeFileSync(filepath, JSON.stringify(backup, null, 2));
    
    // Also save as latest backup
    writeFileSync(join(backupDir, 'latest-backup.json'), JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup sikeresen mentve: ${filepath}`);
    console.log(`📊 Statisztikák:`);
    console.log(`   - Shop itemek: ${backup.counts.shopItems}`);
    console.log(`   - Rules: ${backup.counts.rules}`);
    console.log(`   - Users: ${backup.counts.users}`);
    
    return backup;
    
  } catch (error) {
    console.error('❌ Backup hiba:', error);
    throw error;
  }
}

// Ha közvetlenül futtatjuk
if (process.argv[1].includes('backup-database.ts')) {
  backupDatabase().finally(() => prisma.$disconnect());
}

export { backupDatabase };