-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "coins" DECIMAL(10,2) DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."CurrencyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "description" TEXT,
    "relatedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurrencyTransaction_userId_idx" ON "public"."CurrencyTransaction"("userId");

-- CreateIndex
CREATE INDEX "CurrencyTransaction_createdAt_idx" ON "public"."CurrencyTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."CurrencyTransaction" ADD CONSTRAINT "CurrencyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
