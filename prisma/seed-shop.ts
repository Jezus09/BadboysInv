import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedShopItems() {
  console.log('Shop itemek hozzáadása...');

  // Kulcsok
  await prisma.shopItem.upsert({
    where: { id: 'key-1' },
    update: {},
    create: {
      id: 'key-1',
      name: 'Test Key Item',
      description: 'Test kulcs item',
      price: 2.50,
      category: 'key',
      itemId: 9128, // Collectible Alyx Pin - WORKING from test file
      enabled: true,
      sortOrder: 1
    }
  });

  await prisma.shopItem.upsert({
    where: { id: 'key-2' },
    update: {},
    create: {
      id: 'key-2',
      name: 'Test Case Item',
      description: 'Test láda item',
      price: 1.99,
      category: 'case',
      itemId: 9549, // Graffiti EZ - WORKING from test file
      enabled: true,
      sortOrder: 2
    }
  });

  // Ládák
  await prisma.shopItem.upsert({
    where: { id: 'case-1' },
    update: {},
    create: {
      id: 'case-1',
      name: 'Test Tool Item',
      description: 'Test tool item',
      price: 3.00,
      category: 'tool',
      itemId: 1786, // Music Kit Desert Fire - WORKING from test file
      enabled: true,
      sortOrder: 3
    }
  });

  await prisma.shopItem.upsert({
    where: { id: 'case-2' },
    update: {},
    create: {
      id: 'case-2',
      name: 'Operation Bravo Case',
      description: 'Ritka Operation Bravo láda',
      price: 3.50,
      category: 'case',
      itemId: 2,
      enabled: true,
      sortOrder: 4
    }
  });

  await prisma.shopItem.upsert({
    where: { id: 'case-3' },
    update: {},
    create: {
      id: 'case-3',
      name: 'Dreams & Nightmares Case',
      description: 'Új Dreams & Nightmares láda',
      price: 0.50,
      category: 'case',
      itemId: 4905,
      enabled: true,
      sortOrder: 5
    }
  });

  console.log('✅ Shop itemek sikeresen hozzáadva!');
}

seedShopItems()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });