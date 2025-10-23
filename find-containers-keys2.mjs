import { CS2Economy, CS2ItemType } from "@ianlucas/cs2-lib";

console.log("Searching using filter methods...\n");

try {
  // Try to use the same filter method as in craft system
  console.log("=== CONTAINERS (using filterItems) ===");
  const containers = CS2Economy.filterItems({ type: CS2ItemType.Container });
  console.log(`Found ${containers.length} containers`);

  if (containers.length > 0) {
    console.log("First 5 containers:");
    containers.slice(0, 5).forEach((item) => {
      console.log(`ID: ${item.id}, Name: ${item.name}`);
    });
  }
} catch (error) {
  console.log("Error filtering containers:", error.message);
}

try {
  console.log("\n=== KEYS (using filterItems) ===");
  const keys = CS2Economy.filterItems({ type: CS2ItemType.Key });
  console.log(`Found ${keys.length} keys`);

  if (keys.length > 0) {
    console.log("First 5 keys:");
    keys.slice(0, 5).forEach((item) => {
      console.log(`ID: ${item.id}, Name: ${item.name}`);
    });
  }
} catch (error) {
  console.log("Error filtering keys:", error.message);
}
