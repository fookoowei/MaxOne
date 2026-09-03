-- AlterTable: add family + used tracking (backfill existing rows to their own id as family)
ALTER TABLE "RefreshToken" ADD COLUMN "familyId" TEXT;
UPDATE "RefreshToken" SET "familyId" = "id" WHERE "familyId" IS NULL;
ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" SET NOT NULL;
ALTER TABLE "RefreshToken" ADD COLUMN "usedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
