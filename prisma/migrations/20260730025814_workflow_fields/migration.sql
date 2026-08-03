-- AlterTable
ALTER TABLE "Template" ADD COLUMN "lastApprovedVersion" INTEGER;
ALTER TABLE "Template" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "Template" ADD COLUMN "suspendReason" TEXT;
ALTER TABLE "Template" ADD COLUMN "suspendedAt" DATETIME;
ALTER TABLE "Template" ADD COLUMN "suspendedBy" TEXT;
