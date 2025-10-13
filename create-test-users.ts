import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log("👥 Teszt felhasználók létrehozása...");

  try {
    // Create test users for trading
    const testUsers = [
      {
        id: "76561198123456789",
        name: "TestPlayer1",
        avatar:
          "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg",
        inventory: JSON.stringify([
          { id: 7, uid: 1001, stickers: [], nameTag: null },
          { id: 4, uid: 1002, stickers: [], nameTag: "TestItem1" },
          { id: 1, uid: 1003, stickers: [], nameTag: null }
        ])
      },
      {
        id: "76561198987654321",
        name: "TestPlayer2",
        avatar:
          "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg",
        inventory: JSON.stringify([
          { id: 8, uid: 2001, stickers: [], nameTag: "AK-47 Test" },
          { id: 9, uid: 2002, stickers: [], nameTag: null },
          { id: 10, uid: 2003, stickers: [], nameTag: "M4A4 Test" }
        ])
      },
      {
        id: "76561198555666777",
        name: "TradePartner",
        avatar:
          "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg",
        inventory: JSON.stringify([
          { id: 11, uid: 3001, stickers: [], nameTag: "Glock-18" },
          { id: 12, uid: 3002, stickers: [], nameTag: null }
        ])
      }
    ];

    for (const user of testUsers) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          name: user.name,
          avatar: user.avatar,
          inventory: user.inventory,
          updatedAt: new Date()
        },
        create: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          inventory: user.inventory,
          coins: 100,
          syncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`✅ ${user.name} létrehozva/frissítve`);
    }

    // Test search again
    console.log('\n🔍 Teszt keresés "Test" szóra...');
    const searchResults = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: "Test", mode: "insensitive" } },
              { id: { contains: "Test", mode: "insensitive" } }
            ]
          },
          { id: { not: "76561199513508022" } } // Exclude Jézus
        ]
      },
      select: {
        id: true,
        name: true,
        avatar: true
      },
      take: 20
    });

    console.log(`\nKeresési eredmények (${searchResults.length} db):`);
    searchResults.forEach((user) => {
      console.log(`- ${user.name} (${user.id})`);
    });

    console.log(
      "\n✅ Teszt felhasználók létrehozva! Most próbáld ki a trade oldalt."
    );
  } catch (error) {
    console.error("❌ Hiba:", error);
  }
}

createTestUsers().finally(() => prisma.$disconnect());
