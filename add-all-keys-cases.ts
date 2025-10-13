import { PrismaClient } from "@prisma/client";
import { CS2Economy, CS2ItemType, CS2_ITEMS } from "@ianlucas/cs2-lib";
import { english } from "@ianlucas/cs2-lib/translations";

const prisma = new PrismaClient();

// Initialize CS2Economy
CS2Economy.use({ items: CS2_ITEMS, language: english });

async function addAllKeysAndCases() {
  console.log("Összes kulcs és láda hozzáadása a shophoz...");

  try {
    // Delete existing shop items first
    await prisma.shopItem.deleteMany({});
    console.log("Meglévő shop itemek törölve.");

    let itemCounter = 1;
    let keyCounter = 1;
    let caseCounter = 1;

    // Use the proper CS2Economy filter methods
    console.log("CS2Economy itemek keresése...");

    // Get keys using filter
    console.log("Kulcsok keresése...");
    const keys = CS2Economy.filterItems({ type: CS2ItemType.Key });
    console.log(`${keys.length} kulcs találva.`);

    // Get containers and categorize them
    console.log("Ládák keresése és kategorizálása...");
    const allContainers = CS2Economy.filterItems({
      type: CS2ItemType.Container
    });

    // Categorize containers
    const weaponCases = allContainers.filter((item) => item.isWeaponCase());
    const stickerCapsules = allContainers.filter((item) =>
      item.isStickerCapsule()
    );
    const graffitiBoxes = allContainers.filter((item) => item.isGraffitiBox());
    const souvenirCases = allContainers.filter((item) => item.isSouvenirCase());
    const otherContainers = allContainers.filter(
      (item) =>
        !item.isWeaponCase() &&
        !item.isStickerCapsule() &&
        !item.isGraffitiBox() &&
        !item.isSouvenirCase()
    );

    console.log(`\nContainer típusok:`);
    console.log(`- ${weaponCases.length} fegyver láda`);
    console.log(`- ${stickerCapsules.length} matrica kapszula`);
    console.log(`- ${graffitiBoxes.length} graffiti doboz`);
    console.log(`- ${souvenirCases.length} souvenir láda`);
    console.log(`- ${otherContainers.length} egyéb láda`);
    console.log(
      `\nÖsszesen ${keys.length + allContainers.length} kulcs és láda találva.`
    );

    // Add keys to shop
    console.log(`${keys.length} kulcs hozzáadása...`);

    for (const key of keys) {
      await prisma.shopItem.create({
        data: {
          id: `key-${keyCounter}`,
          name: key.name || `Key ${key.id}`,
          description: `Kulcs ID: ${key.id}`,
          price: 2.5,
          category: "key",
          itemId: key.id,
          enabled: true,
          sortOrder: keyCounter
        }
      });
      keyCounter++;
    }

    // Add weapon cases to shop
    console.log(`${weaponCases.length} fegyver láda hozzáadása...`);
    for (const container of weaponCases) {
      await prisma.shopItem.create({
        data: {
          id: `weapon-case-${caseCounter}`,
          name: container.name || `Weapon Case ${container.id}`,
          description: `Fegyver láda ID: ${container.id}`,
          price: 1.5,
          category: "weapon-case",
          itemId: container.id,
          enabled: true,
          sortOrder: 1000 + caseCounter
        }
      });
      caseCounter++;
    }

    // Add sticker capsules to shop
    console.log(`${stickerCapsules.length} matrica kapszula hozzáadása...`);
    for (const container of stickerCapsules) {
      await prisma.shopItem.create({
        data: {
          id: `sticker-capsule-${caseCounter}`,
          name: container.name || `Sticker Capsule ${container.id}`,
          description: `Matrica kapszula ID: ${container.id}`,
          price: 1.0,
          category: "sticker-capsule",
          itemId: container.id,
          enabled: true,
          sortOrder: 2000 + caseCounter
        }
      });
      caseCounter++;
    }

    // Add graffiti boxes to shop
    console.log(`${graffitiBoxes.length} graffiti doboz hozzáadása...`);
    for (const container of graffitiBoxes) {
      await prisma.shopItem.create({
        data: {
          id: `graffiti-box-${caseCounter}`,
          name: container.name || `Graffiti Box ${container.id}`,
          description: `Graffiti doboz ID: ${container.id}`,
          price: 0.75,
          category: "graffiti-box",
          itemId: container.id,
          enabled: true,
          sortOrder: 3000 + caseCounter
        }
      });
      caseCounter++;
    }

    // Add souvenir cases to shop
    console.log(`${souvenirCases.length} souvenir láda hozzáadása...`);
    for (const container of souvenirCases) {
      await prisma.shopItem.create({
        data: {
          id: `souvenir-case-${caseCounter}`,
          name: container.name || `Souvenir Case ${container.id}`,
          description: `Souvenir láda ID: ${container.id}`,
          price: 2.0,
          category: "souvenir-case",
          itemId: container.id,
          enabled: true,
          sortOrder: 4000 + caseCounter
        }
      });
      caseCounter++;
    }

    // Add other containers to shop
    console.log(`${otherContainers.length} egyéb láda hozzáadása...`);
    for (const container of otherContainers) {
      await prisma.shopItem.create({
        data: {
          id: `other-container-${caseCounter}`,
          name: container.name || `Container ${container.id}`,
          description: `Egyéb láda ID: ${container.id}`,
          price: 1.25,
          category: "other-container",
          itemId: container.id,
          enabled: true,
          sortOrder: 5000 + caseCounter
        }
      });
      caseCounter++;
    }

    const totalContainers =
      weaponCases.length +
      stickerCapsules.length +
      graffitiBoxes.length +
      souvenirCases.length +
      otherContainers.length;

    console.log(
      `\n✅ Összesen ${keys.length} kulcs és ${totalContainers} láda hozzáadva a shophoz!`
    );
  } catch (error) {
    console.error("Hiba történt:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addAllKeysAndCases();
