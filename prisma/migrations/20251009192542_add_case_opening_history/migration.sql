-- CreateTable
CREATE TABLE "CaseOpening" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userAvatar" TEXT NOT NULL,
    "caseItemId" INTEGER NOT NULL,
    "caseName" TEXT NOT NULL,
    "keyItemId" INTEGER,
    "keyName" TEXT,
    "unlockedItemId" INTEGER NOT NULL,
    "unlockedName" TEXT NOT NULL,
    "unlockedRarity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseOpening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseOpening_createdAt_idx" ON "CaseOpening"("createdAt");

-- CreateIndex
CREATE INDEX "CaseOpening_userId_idx" ON "CaseOpening"("userId");

-- AddForeignKey
ALTER TABLE "CaseOpening" ADD CONSTRAINT "CaseOpening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
