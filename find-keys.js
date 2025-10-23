import { CS2Economy } from "@ianlucas/cs2-lib";

console.log("Finding CS2 Keys...");

// Find all key items
const keys = CS2Economy.filterItems({ type: "Key" });
console.log("Total keys found:", keys.length);

// Show first 10 keys
console.log("\nFirst 10 keys:");
keys.slice(0, 10).forEach((key) => {
  console.log(`ID: ${key.id}, Name: ${key.name}`);
});

// Look for CS:GO Weapon Case Key specifically
const caseKey = keys.find((key) => key.name.includes("CS:GO Weapon Case Key"));
if (caseKey) {
  console.log("\nCS:GO Weapon Case Key found:");
  console.log(`ID: ${caseKey.id}, Name: ${caseKey.name}`);
} else {
  console.log("\nCS:GO Weapon Case Key not found");
}

// Find all case items too
console.log("\n\nFinding CS2 Cases...");
const cases = CS2Economy.filterItems({ type: "Case" });
console.log("Total cases found:", cases.length);

// Show first 10 cases
console.log("\nFirst 10 cases:");
cases.slice(0, 10).forEach((caseItem) => {
  console.log(`ID: ${caseItem.id}, Name: ${caseItem.name}`);
});
