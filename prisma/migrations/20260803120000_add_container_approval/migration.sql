-- 컨테이너 승인 워크플로우 필드 추가 (DRAFT → REVIEW → APPROVED/REJECTED)
ALTER TABLE "Container" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Container" ADD COLUMN "approvalRequestedAt" DATETIME;
ALTER TABLE "Container" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Container" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "Container" ADD COLUMN "rejectReason" TEXT;
