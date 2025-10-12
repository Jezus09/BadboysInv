import { CS2Economy, CS2ItemType } from '@ianlucas/cs2-lib';

console.log("Finding low ID containers and keys...\n");

// Check IDs from 1 to 2000 for containers and keys
for (let id = 1; id <= 2000; id++) {
  try {
    const item = CS2Economy.getById(id);
    if (item && (item.type === CS2ItemType.Container || item.type === CS2ItemType.Key)) {
      console.log(`ID ${id}: ${item.name} (${item.type})`);
    }
  } catch (error) {
    // Skip invalid IDs
  }
}

console.log("\nChecking some higher IDs...");

// Check some specific higher IDs
const higherIds = [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500];
for (let id of higherIds) {
  try {
    const item = CS2Economy.getById(id);
    if (item && (item.type === CS2ItemType.Container || item.type === CS2ItemType.Key)) {
      console.log(`ID ${id}: ${item.name} (${item.type})`);
    }
  } catch (error) {
    // Skip invalid IDs
  }
}