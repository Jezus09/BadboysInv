import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixEmptyInventories() {
  try {
    console.log("Looking for users with empty inventories...");

    // Find users with null or empty inventory
    const usersWithoutInventory = await prisma.user.findMany({
      where: {
        OR: [{ inventory: null }, { inventory: "" }]
      },
      select: {
        id: true,
        name: true,
        inventory: true
      }
    });

    console.log(
      `Found ${usersWithoutInventory.length} users with empty inventories`
    );

    if (usersWithoutInventory.length === 0) {
      console.log("No users need inventory initialization.");
      return;
    }

    // Initialize empty inventory for each user
    const emptyInventory = JSON.stringify({
      items: [],
      version: 1
    });

    for (const user of usersWithoutInventory) {
      console.log(`Initializing inventory for user: ${user.name} (${user.id})`);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          inventory: emptyInventory,
          coins: 0 // Ensure coins are also set
        }
      });
    }

    console.log("✅ All inventories have been initialized!");
  } catch (error) {
    console.error("❌ Error fixing inventories:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmptyInventories();
