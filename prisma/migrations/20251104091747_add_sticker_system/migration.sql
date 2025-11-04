-- CreateTable
CREATE TABLE "Sticker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rarityId" TEXT,
    "rarityName" TEXT,
    "rarityColor" TEXT,
    "type" TEXT,
    "effect" TEXT,
    "tournamentId" INTEGER,
    "tournamentName" TEXT,
    "imageUrl" TEXT NOT NULL,
    "marketHashName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWeaponInstance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weaponDefIndex" INTEGER NOT NULL,
    "weaponName" TEXT NOT NULL,
    "weaponId" TEXT NOT NULL,
    "skinId" INTEGER,
    "wear" DOUBLE PRECISION,
    "seed" INTEGER,
    "itemUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWeaponInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeaponSticker" (
    "id" TEXT NOT NULL,
    "weaponId" TEXT NOT NULL,
    "stickerId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "positionZ" DOUBLE PRECISION NOT NULL,
    "rotationX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotationY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotationZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "wear" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeaponSticker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sticker_type_idx" ON "Sticker"("type");

-- CreateIndex
CREATE INDEX "Sticker_effect_idx" ON "Sticker"("effect");

-- CreateIndex
CREATE INDEX "Sticker_tournamentId_idx" ON "Sticker"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWeaponInstance_itemUuid_key" ON "UserWeaponInstance"("itemUuid");

-- CreateIndex
CREATE INDEX "UserWeaponInstance_userId_idx" ON "UserWeaponInstance"("userId");

-- CreateIndex
CREATE INDEX "UserWeaponInstance_weaponId_idx" ON "UserWeaponInstance"("weaponId");

-- CreateIndex
CREATE INDEX "UserWeaponInstance_itemUuid_idx" ON "UserWeaponInstance"("itemUuid");

-- CreateIndex
CREATE INDEX "WeaponSticker_weaponId_idx" ON "WeaponSticker"("weaponId");

-- CreateIndex
CREATE INDEX "WeaponSticker_stickerId_idx" ON "WeaponSticker"("stickerId");

-- CreateIndex
CREATE UNIQUE INDEX "WeaponSticker_weaponId_slot_key" ON "WeaponSticker"("weaponId", "slot");

-- AddForeignKey
ALTER TABLE "WeaponSticker" ADD CONSTRAINT "WeaponSticker_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "UserWeaponInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaponSticker" ADD CONSTRAINT "WeaponSticker_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON UPDATE CASCADE;
