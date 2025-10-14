-- CreateTable
CREATE TABLE "CaseOpeningMessage" (
    "id" TEXT NOT NULL,
    "caseOpeningId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userAvatar" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseOpeningMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseOpeningMessage_caseOpeningId_idx" ON "CaseOpeningMessage"("caseOpeningId");

-- CreateIndex
CREATE INDEX "CaseOpeningMessage_userId_idx" ON "CaseOpeningMessage"("userId");

-- CreateIndex
CREATE INDEX "CaseOpeningMessage_createdAt_idx" ON "CaseOpeningMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "CaseOpeningMessage" ADD CONSTRAINT "CaseOpeningMessage_caseOpeningId_fkey" FOREIGN KEY ("caseOpeningId") REFERENCES "CaseOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseOpeningMessage" ADD CONSTRAINT "CaseOpeningMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "CaseOpeningMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
