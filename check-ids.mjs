// A simple script to check CS2 item IDs
import { CS2Economy, CS2ItemType } from '@ianlucas/cs2-lib';

console.log("Checking CS2 item IDs...\n");

// Find all keys
console.log("=== KEYS ===");
const keys = CS2Economy.filterItems({ type: CS2ItemType.Key });
console.log(`Found ${keys.length} keys:`);

keys.slice(0, 10).forEach(key => {
  console.log(`ID: ${key.id}, Name: ${key.name || 'Unnamed'}`);
});

// Find all containers (cases)
console.log("\n=== CONTAINERS (Cases) ===");
const containers = CS2Economy.filterItems({ type: CS2ItemType.Container });
console.log(`Found ${containers.length} containers:`);

containers.slice(0, 10).forEach(container => {
  console.log(`ID: ${container.id}, Name: ${container.name || 'Unnamed'}`);
});

// Try to find the CS:GO Weapon Case Key specifically
console.log("\n=== Looking for CS:GO Weapon Case Key ===");
const weaponCaseKey = keys.find(key => 
  key.name && key.name.toLowerCase().includes('weapon case key')
);

if (weaponCaseKey) {
  console.log(`Found: ID: ${weaponCaseKey.id}, Name: ${weaponCaseKey.name}`);
} else {
  console.log("CS:GO Weapon Case Key not found");
}

// Try to check what item ID 5000 actually is
console.log("\n=== Checking what item ID 5000 is ===");
try {
  const item5000 = CS2Economy.getById(5000);
  if (item5000) {
    console.log(`ID 5000 is: ${item5000.name} (type: ${item5000.type})`);
  } else {
    console.log("Item ID 5000 not found");
  }
} catch (error) {
  console.log("Error checking ID 5000:", error.message);
}

// Try some other IDs that might be keys
console.log("\n=== Checking other potential key IDs ===");
for (let id of [1, 2, 3, 10, 20, 100, 250, 300, 350, 400, 450, 500]) {
  try {
    const item = CS2Economy.getById(id);
    if (item && item.type === CS2ItemType.Key) {
      console.log(`Key found at ID ${id}: ${item.name}`);
    }
  } catch (error) {
    // Skip errors
  }
}