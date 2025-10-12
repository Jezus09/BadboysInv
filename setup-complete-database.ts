import { PrismaClient } from '@prisma/client';
import { CS2Economy, CS2ItemType, CS2_ITEMS } from '@ianlucas/cs2-lib';
import { english } from '@ianlucas/cs2-lib/translations';
import { backupDatabase } from './backup-database.js';

const prisma = new PrismaClient();

// Initialize CS2Economy
CS2Economy.use({ items: CS2_ITEMS, language: english });

async function setupCompleteDatabase() {
  console.log('🚀 Teljes adatbázis setup indítása...');
  
  try {
    // 1. First backup current state (if any data exists)
    try {
      console.log('💾 Jelenlegi állapot mentése...');
      await backupDatabase();
    } catch (error) {
      console.log('ℹ️ Nincs mentendő adat, folytatás...');
    }
    
    // 2. Setup owner (Jézus account)
    console.log('👑 Owner beállítása...');
    
    // Find Jézus account
    const jezusUser = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Jézus', mode: 'insensitive' } },
          { name: { contains: 'Jezus', mode: 'insensitive' } },
          { name: { contains: 'Jesus', mode: 'insensitive' } }
        ]
      }
    });
    
    if (jezusUser) {
      await prisma.rule.upsert({
        where: { name: "ownerSteamId" },
        update: { value: jezusUser.id },
        create: {
          name: "ownerSteamId",
          type: "string",
          value: jezusUser.id
        }
      });
      console.log(`✅ ${jezusUser.name} (${jezusUser.id}) beállítva ownernek`);
    } else {
      console.log('⚠️ Jézus account nem található, manual setup szükséges');
    }
    
    // 3. Setup shop items
    console.log('🛍️ Shop itemek beállítása...');
    
    // Delete existing shop items
    await prisma.shopItem.deleteMany({});
    
    let itemCounter = 1;
    
    // Get keys
    const keys = CS2Economy.filterItems({ type: CS2ItemType.Key });
    console.log(`🔑 ${keys.length} kulcs hozzáadása...`);
    
    for (const key of keys) {
      await prisma.shopItem.create({
        data: {
          id: `key-${itemCounter}`,
          name: key.name,
          description: `${key.name} - Key`,
          price: 2.50,
          category: 'key',
          itemId: key.id,
          enabled: true,
          sortOrder: itemCounter
        }
      });
      itemCounter++;
    }
    
    // Get containers
    const containers = CS2Economy.filterItems({ type: CS2ItemType.Container });
    const weaponCases = containers.filter(item => item.isWeaponCase());
    const stickerCapsules = containers.filter(item => item.isStickerCapsule());
    const graffitiBoxes = containers.filter(item => item.isGraffitiBox());
    const souvenirCases = containers.filter(item => item.isSouvenirCase());
    const otherContainers = containers.filter(item => 
      !item.isWeaponCase() && !item.isStickerCapsule() && 
      !item.isGraffitiBox() && !item.isSouvenirCase()
    );
    
    // Add weapon cases
    console.log(`📦 ${weaponCases.length} fegyver láda hozzáadása...`);
    for (const container of weaponCases) {
      await prisma.shopItem.create({
        data: {
          id: `case-weapon-${itemCounter}`,
          name: container.name,
          description: `${container.name} - Weapon Case`,
          price: 2.99,
          category: 'case',
          itemId: container.id,
          enabled: true,
          sortOrder: itemCounter
        }
      });
      itemCounter++;
    }
    
    // Add sticker capsules
    console.log(`🏷️ ${stickerCapsules.length} matrica kapszula hozzáadása...`);
    for (const container of stickerCapsules) {
      await prisma.shopItem.create({
        data: {
          id: `case-sticker-${itemCounter}`,
          name: container.name,
          description: `${container.name} - Sticker Capsule`,
          price: 1.99,
          category: 'capsule',
          itemId: container.id,
          enabled: true,
          sortOrder: itemCounter
        }
      });
      itemCounter++;
    }
    
    // Add graffiti boxes
    console.log(`🎨 ${graffitiBoxes.length} graffiti doboz hozzáadása...`);
    for (const container of graffitiBoxes) {
      await prisma.shopItem.create({
        data: {
          id: `case-graffiti-${itemCounter}`,
          name: container.name,
          description: `${container.name} - Graffiti Box`,
          price: 0.99,
          category: 'graffiti',
          itemId: container.id,
          enabled: true,
          sortOrder: itemCounter
        }
      });
      itemCounter++;
    }
    
    // Add souvenir cases
    console.log(`🏆 ${souvenirCases.length} souvenir láda hozzáadása...`);
    for (const container of souvenirCases) {
      await prisma.shopItem.create({
        data: {
          id: `case-souvenir-${itemCounter}`,
          name: container.name,
          description: `${container.name} - Souvenir Case`,
          price: 3.99,
          category: 'souvenir',
          itemId: container.id,
          enabled: true,
          sortOrder: itemCounter
        }
      });
      itemCounter++;
    }
    
    // Add other containers
    console.log(`📋 ${otherContainers.length} egyéb láda hozzáadása...`);
    for (const container of otherContainers) {
      await prisma.shopItem.create({
        data: {
          id: `case-other-${itemCounter}`,
          name: container.name,
          description: `${container.name} - Container`,
          price: 1.50,
          category: 'other',
          itemId: container.id,
          enabled: true,
          sortOrder: itemCounter
        }
      });
      itemCounter++;
    }
    
    // 4. Create final backup
    console.log('💾 Végleges backup készítése...');
    const finalBackup = await backupDatabase();
    
    console.log('\n🎉 Teljes adatbázis setup befejezve!');
    console.log('📊 Összefoglaló:');
    console.log(`   - Kulcsok: ${keys.length}`);
    console.log(`   - Fegyver ládák: ${weaponCases.length}`);
    console.log(`   - Matrica kapszulák: ${stickerCapsules.length}`);
    console.log(`   - Graffiti dobozok: ${graffitiBoxes.length}`);
    console.log(`   - Souvenir ládák: ${souvenirCases.length}`);
    console.log(`   - Egyéb ládák: ${otherContainers.length}`);
    console.log(`   - Összesen: ${finalBackup.counts.shopItems} shop item`);
    console.log('\n💡 Használat:');
    console.log('   - Backup: npx tsx backup-database.ts');
    console.log('   - Restore: npx tsx restore-database.ts');
    console.log('   - Teljes setup: npx tsx setup-complete-database.ts');
    
  } catch (error) {
    console.error('❌ Setup hiba:', error);
    throw error;
  }
}

// Ha közvetlenül futtatjuk
if (process.argv[1].includes('setup-complete-database.ts')) {
  setupCompleteDatabase().finally(() => prisma.$disconnect());
}

export { setupCompleteDatabase };