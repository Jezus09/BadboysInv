import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function addTestCoins() {
  // Try to get user ID from environment or use default
  const STEAM_ID = process.env.TEST_USER_ID || "76561199513508022";
  const amount = new Decimal(100);

  console.log(`Adding ${amount} coins to user ${STEAM_ID}...`);

  try {
    // First try to find the user
    const user = await prisma.user.findUnique({
      where: { id: STEAM_ID },
      select: { id: true, name: true, coins: true }
    });

    if (!user) {
      console.log(`❌ User ${STEAM_ID} not found in database.`);
      console.log("Available users:");

      const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, coins: true },
        take: 5
      });

      allUsers.forEach((u) => {
        console.log(
          `  - ${u.id} (${u.name}) - ${(u.coins || new Decimal(0)).toFixed(2)} coins`
        );
      });

      if (allUsers.length > 0) {
        const firstUser = allUsers[0];
        console.log(`\nUsing first available user: ${firstUser.id}`);

        const result = await prisma.user.update({
          where: { id: firstUser.id },
          data: {
            coins: {
              increment: amount
            }
          },
          select: { coins: true, name: true }
        });

        console.log(
          "✅ New balance for",
          firstUser.name,
          ":",
          (result.coins || new Decimal(0)).toFixed(2)
        );
      }

      return;
    }

    const result = await prisma.user.update({
      where: { id: STEAM_ID },
      data: {
        coins: {
          increment: amount
        }
      },
      select: { coins: true, name: true }
    });

    console.log(
      "✅ New balance for",
      user.name,
      ":",
      (result.coins || new Decimal(0)).toFixed(2)
    );
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

addTestCoins().finally(() => prisma.$disconnect());
