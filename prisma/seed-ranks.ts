import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_RANKS = [
  { rankName: "Unranked", rankTag: "[UR]", minExperience: 0, maxExperience: 99, rankColor: "#808080" },
  { rankName: "Silver I", rankTag: "[S1]", minExperience: 100, maxExperience: 299, rankColor: "#C0C0C0" },
  { rankName: "Silver II", rankTag: "[S2]", minExperience: 300, maxExperience: 599, rankColor: "#C0C0C0" },
  { rankName: "Silver III", rankTag: "[S3]", minExperience: 600, maxExperience: 999, rankColor: "#C0C0C0" },
  { rankName: "Silver IV", rankTag: "[S4]", minExperience: 1000, maxExperience: 1499, rankColor: "#C0C0C0" },
  { rankName: "Silver Elite", rankTag: "[SE]", minExperience: 1500, maxExperience: 1999, rankColor: "#C0C0C0" },
  { rankName: "Silver Elite Master", rankTag: "[SEM]", minExperience: 2000, maxExperience: 2799, rankColor: "#C0C0C0" },
  { rankName: "Gold Nova I", rankTag: "[GN1]", minExperience: 2800, maxExperience: 3799, rankColor: "#FFD700" },
  { rankName: "Gold Nova II", rankTag: "[GN2]", minExperience: 3800, maxExperience: 4999, rankColor: "#FFD700" },
  { rankName: "Gold Nova III", rankTag: "[GN3]", minExperience: 5000, maxExperience: 6499, rankColor: "#FFD700" },
  { rankName: "Gold Nova Master", rankTag: "[GNM]", minExperience: 6500, maxExperience: 8299, rankColor: "#FFD700" },
  { rankName: "Master Guardian I", rankTag: "[MG1]", minExperience: 8300, maxExperience: 10499, rankColor: "#FF8C00" },
  { rankName: "Master Guardian II", rankTag: "[MG2]", minExperience: 10500, maxExperience: 13199, rankColor: "#FF8C00" },
  { rankName: "Master Guardian Elite", rankTag: "[MGE]", minExperience: 13200, maxExperience: 16499, rankColor: "#FF8C00" },
  { rankName: "Distinguished Master Guardian", rankTag: "[DMG]", minExperience: 16500, maxExperience: 20499, rankColor: "#FF8C00" },
  { rankName: "Legendary Eagle", rankTag: "[LE]", minExperience: 20500, maxExperience: 25499, rankColor: "#9370DB" },
  { rankName: "Legendary Eagle Master", rankTag: "[LEM]", minExperience: 25500, maxExperience: 31999, rankColor: "#9370DB" },
  { rankName: "Supreme Master First Class", rankTag: "[SMFC]", minExperience: 32000, maxExperience: 39999, rankColor: "#FF1493" },
  { rankName: "Global Elite", rankTag: "[GE]", minExperience: 40000, maxExperience: 999999999, rankColor: "#FF0000" }
];

async function main() {
  console.log('Seeding ranks...');

  for (const rank of DEFAULT_RANKS) {
    await prisma.rank.upsert({
      where: { rankName: rank.rankName },
      update: {},
      create: rank
    });
  }

  console.log(`✅ ${DEFAULT_RANKS.length} ranks seeded successfully!`);
}

main()
  .catch((e) => {
    console.error('Error seeding ranks:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
