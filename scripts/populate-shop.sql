-- Populate shop with all CS2 cases and keys
-- Run this script in PostgreSQL to add all items to the shop

-- First, delete existing shop items (optional - comment out if you want to keep existing)
-- DELETE FROM "ShopItem";

-- Keys
INSERT INTO "ShopItem" (id, name, description, price, category, "itemId", enabled, "sortOrder", "imageUrl") VALUES
(gen_random_uuid(), 'CS:GO Case Key', 'Használható minden nem-event ládához', 2.49, 'key', 4670, true, 1, NULL),
(gen_random_uuid(), 'Operation Bravo Case Key', 'Operation Bravo ládákhoz', 2.49, 'key', 4672, true, 2, NULL),
(gen_random_uuid(), 'Operation Phoenix Case Key', 'Operation Phoenix ládákhoz', 2.49, 'key', 4673, true, 3, NULL),
(gen_random_uuid(), 'Operation Breakout Case Key', 'Operation Breakout ládákhoz', 2.49, 'key', 4674, true, 4, NULL),
(gen_random_uuid(), 'Operation Vanguard Case Key', 'Operation Vanguard ládákhoz', 2.49, 'key', 4675, true, 5, NULL),
(gen_random_uuid(), 'Chroma Case Key', 'Chroma ládákhoz', 2.49, 'key', 4676, true, 6, NULL),
(gen_random_uuid(), 'Chroma 2 Case Key', 'Chroma 2 ládákhoz', 2.49, 'key', 4677, true, 7, NULL),
(gen_random_uuid(), 'Falchion Case Key', 'Falchion ládákhoz', 2.49, 'key', 4678, true, 8, NULL),
(gen_random_uuid(), 'Shadow Case Key', 'Shadow ládákhoz', 2.49, 'key', 4679, true, 9, NULL),
(gen_random_uuid(), 'Revolver Case Key', 'Revolver ládákhoz', 2.49, 'key', 4680, true, 10, NULL),
(gen_random_uuid(), 'Chroma 3 Case Key', 'Chroma 3 ládákhoz', 2.49, 'key', 4681, true, 11, NULL),
(gen_random_uuid(), 'Gamma Case Key', 'Gamma ládákhoz', 2.49, 'key', 4682, true, 12, NULL),
(gen_random_uuid(), 'Gamma 2 Case Key', 'Gamma 2 ládákhoz', 2.49, 'key', 4683, true, 13, NULL),
(gen_random_uuid(), 'Glove Case Key', 'Glove ládákhoz', 2.49, 'key', 4684, true, 14, NULL),
(gen_random_uuid(), 'Spectrum Case Key', 'Spectrum ládákhoz', 2.49, 'key', 4685, true, 15, NULL),
(gen_random_uuid(), 'Spectrum 2 Case Key', 'Spectrum 2 ládákhoz', 2.49, 'key', 4686, true, 16, NULL),
(gen_random_uuid(), 'Clutch Case Key', 'Clutch ládákhoz', 2.49, 'key', 4687, true, 17, NULL),
(gen_random_uuid(), 'Horizon Case Key', 'Horizon ládákhoz', 2.49, 'key', 4688, true, 18, NULL),
(gen_random_uuid(), 'Danger Zone Case Key', 'Danger Zone ládákhoz', 2.49, 'key', 4689, true, 19, NULL),
(gen_random_uuid(), 'Prisma Case Key', 'Prisma ládákhoz', 2.49, 'key', 4690, true, 20, NULL),
(gen_random_uuid(), 'CS20 Case Key', 'CS20 ládákhoz', 2.49, 'key', 4691, true, 21, NULL),
(gen_random_uuid(), 'Shattered Web Case Key', 'Shattered Web ládákhoz', 2.49, 'key', 4692, true, 22, NULL),
(gen_random_uuid(), 'Prisma 2 Case Key', 'Prisma 2 ládákhoz', 2.49, 'key', 4693, true, 23, NULL),
(gen_random_uuid(), 'Fracture Case Key', 'Fracture ládákhoz', 2.49, 'key', 4694, true, 24, NULL),
(gen_random_uuid(), 'Snakebite Case Key', 'Snakebite ládákhoz', 2.49, 'key', 4695, true, 25, NULL),
(gen_random_uuid(), 'Operation Broken Fang Case Key', 'Broken Fang ládákhoz', 2.49, 'key', 4696, true, 26, NULL),
(gen_random_uuid(), 'Dreams & Nightmares Case Key', 'Dreams & Nightmares ládákhoz', 2.49, 'key', 4697, true, 27, NULL),
(gen_random_uuid(), 'Recoil Case Key', 'Recoil ládákhoz', 2.49, 'key', 4698, true, 28, NULL),
(gen_random_uuid(), 'Revolution Case Key', 'Revolution ládákhoz', 2.49, 'key', 4699, true, 29, NULL),
(gen_random_uuid(), 'Kilowatt Case Key', 'Kilowatt ládákhoz', 2.49, 'key', 4700, true, 30, NULL);

-- Weapon Cases
INSERT INTO "ShopItem" (id, name, description, price, category, "itemId", enabled, "sortOrder", "imageUrl") VALUES
(gen_random_uuid(), 'CS:GO Weapon Case', 'Az eredeti CS:GO láda', 0.99, 'weapon-case', 4660, true, 1, NULL),
(gen_random_uuid(), 'CS:GO Weapon Case 2', 'A második CS:GO láda', 0.99, 'weapon-case', 4661, true, 2, NULL),
(gen_random_uuid(), 'CS:GO Weapon Case 3', 'A harmadik CS:GO láda', 0.99, 'weapon-case', 4662, true, 3, NULL),
(gen_random_uuid(), 'Operation Bravo Case', 'Operation Bravo láda', 0.99, 'weapon-case', 4663, true, 4, NULL),
(gen_random_uuid(), 'eSports 2013 Case', 'eSports 2013 láda', 0.99, 'weapon-case', 4664, true, 5, NULL),
(gen_random_uuid(), 'Operation Phoenix Weapon Case', 'Operation Phoenix láda', 0.99, 'weapon-case', 4665, true, 6, NULL),
(gen_random_uuid(), 'Huntsman Weapon Case', 'Huntsman láda', 0.99, 'weapon-case', 4666, true, 7, NULL),
(gen_random_uuid(), 'Operation Breakout Weapon Case', 'Breakout láda', 0.99, 'weapon-case', 4667, true, 8, NULL),
(gen_random_uuid(), 'eSports 2014 Summer Case', 'eSports Summer láda', 0.99, 'weapon-case', 4668, true, 9, NULL),
(gen_random_uuid(), 'Operation Vanguard Weapon Case', 'Vanguard láda', 0.99, 'weapon-case', 4669, true, 10, NULL),
(gen_random_uuid(), 'Chroma Case', 'Chroma láda', 0.99, 'weapon-case', 4671, true, 11, NULL),
(gen_random_uuid(), 'Chroma 2 Case', 'Chroma 2 láda', 0.99, 'weapon-case', 4671, true, 12, NULL),
(gen_random_uuid(), 'Falchion Case', 'Falchion láda', 0.99, 'weapon-case', 4672, true, 13, NULL),
(gen_random_uuid(), 'Shadow Case', 'Shadow láda', 0.99, 'weapon-case', 4673, true, 14, NULL),
(gen_random_uuid(), 'Revolver Case', 'Revolver láda', 0.99, 'weapon-case', 4674, true, 15, NULL),
(gen_random_uuid(), 'Operation Wildfire Case', 'Wildfire láda', 0.99, 'weapon-case', 4675, true, 16, NULL),
(gen_random_uuid(), 'Chroma 3 Case', 'Chroma 3 láda', 0.99, 'weapon-case', 4676, true, 17, NULL),
(gen_random_uuid(), 'Gamma Case', 'Gamma láda', 0.99, 'weapon-case', 4677, true, 18, NULL),
(gen_random_uuid(), 'Gamma 2 Case', 'Gamma 2 láda', 0.99, 'weapon-case', 4678, true, 19, NULL),
(gen_random_uuid(), 'Glove Case', 'Glove láda - kesztyűkkel', 1.49, 'weapon-case', 4679, true, 20, NULL),
(gen_random_uuid(), 'Spectrum Case', 'Spectrum láda', 0.99, 'weapon-case', 4680, true, 21, NULL),
(gen_random_uuid(), 'Spectrum 2 Case', 'Spectrum 2 láda', 0.99, 'weapon-case', 4681, true, 22, NULL),
(gen_random_uuid(), 'Operation Hydra Case', 'Hydra láda', 0.99, 'weapon-case', 4682, true, 23, NULL),
(gen_random_uuid(), 'Clutch Case', 'Clutch láda', 0.99, 'weapon-case', 4683, true, 24, NULL),
(gen_random_uuid(), 'Horizon Case', 'Horizon láda', 0.99, 'weapon-case', 4684, true, 25, NULL),
(gen_random_uuid(), 'Danger Zone Case', 'Danger Zone láda', 0.99, 'weapon-case', 4685, true, 26, NULL),
(gen_random_uuid(), 'Prisma Case', 'Prisma láda', 0.99, 'weapon-case', 4686, true, 27, NULL),
(gen_random_uuid(), 'CS20 Case', 'CS 20. évfordulós láda', 0.99, 'weapon-case', 4687, true, 28, NULL),
(gen_random_uuid(), 'Shattered Web Case', 'Shattered Web láda', 0.99, 'weapon-case', 4688, true, 29, NULL),
(gen_random_uuid(), 'Prisma 2 Case', 'Prisma 2 láda', 0.99, 'weapon-case', 4689, true, 30, NULL),
(gen_random_uuid(), 'Fracture Case', 'Fracture láda', 0.99, 'weapon-case', 4690, true, 31, NULL),
(gen_random_uuid(), 'Snakebite Case', 'Snakebite láda', 0.99, 'weapon-case', 4691, true, 32, NULL),
(gen_random_uuid(), 'Operation Broken Fang Case', 'Broken Fang láda', 0.99, 'weapon-case', 4692, true, 33, NULL),
(gen_random_uuid(), 'Dreams & Nightmares Case', 'Közösségi láda', 0.99, 'weapon-case', 4693, true, 34, NULL),
(gen_random_uuid(), 'Recoil Case', 'Recoil láda', 0.99, 'weapon-case', 4694, true, 35, NULL),
(gen_random_uuid(), 'Revolution Case', 'Revolution láda', 0.99, 'weapon-case', 4695, true, 36, NULL),
(gen_random_uuid(), 'Kilowatt Case', 'Kilowatt láda', 0.99, 'weapon-case', 4696, true, 37, NULL);

-- Sticker Capsules
INSERT INTO "ShopItem" (id, name, description, price, category, "itemId", enabled, "sortOrder", "imageUrl") VALUES
(gen_random_uuid(), 'Sticker Capsule', 'Közösségi matrica kapszula', 0.99, 'sticker-capsule', 4701, true, 1, NULL),
(gen_random_uuid(), 'Sticker Capsule 2', 'Közösségi matrica kapszula 2', 0.99, 'sticker-capsule', 4702, true, 2, NULL),
(gen_random_uuid(), 'Community Sticker Capsule 1', 'Közösségi matrica kapszula 1', 0.99, 'sticker-capsule', 4703, true, 3, NULL);

-- Print this message when done
DO $$
BEGIN
  RAISE NOTICE 'Shop items populated successfully!';
  RAISE NOTICE 'Added keys, weapon cases, and sticker capsules to the shop.';
END $$;
