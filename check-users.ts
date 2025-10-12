import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('👥 Felhasználók ellenőrzése...');
  
  try {
    const users = await prisma.user.findMany();
    
    console.log(`\nTalált ${users.length} felhasználó:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (ID: ${user.id})`);
      console.log(`   Avatar: ${user.avatar}`);
      console.log(`   Inventory itemek: ${user.inventory ? JSON.parse(user.inventory).length : 0}`);
      console.log('');
    });
    
    // Test search function
    console.log('🔍 Teszt keresés "J" betűre...');
    const searchResults = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: 'J', mode: 'insensitive' } },
              { id: { contains: 'J', mode: 'insensitive' } }
            ]
          },
          { id: { not: '76561199513508022' } } // Exclude current user (Jézus)
        ]
      },
      select: {
        id: true,
        name: true,
        avatar: true
      },
      take: 20
    });
    
    console.log(`Keresési eredmények (${searchResults.length} db):`);
    searchResults.forEach(user => {
      console.log(`- ${user.name} (${user.id})`);
    });
    
  } catch (error) {
    console.error('❌ Hiba:', error);
  }
}

checkUsers().finally(() => prisma.$disconnect());