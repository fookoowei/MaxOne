-- AlterTable: TOTP 2FA + recovery codes
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT,
  ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "totpRecoveryHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
