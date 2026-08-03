-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "containerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conditionGroup" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "displayOn" BOOLEAN NOT NULL DEFAULT true,
    "startAtOnApproval" BOOLEAN NOT NULL DEFAULT false,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "rejectReason" TEXT,
    "suspendReason" TEXT,
    "suspendedBy" TEXT,
    "suspendedAt" DATETIME,
    "lastApprovedVersion" INTEGER,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Template_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Template" ("conditionGroup", "containerId", "createdAt", "endAt", "id", "isDefault", "lastApprovedVersion", "name", "priority", "publishedAt", "rejectReason", "startAt", "status", "suspendReason", "suspendedAt", "suspendedBy", "updatedAt", "version") SELECT "conditionGroup", "containerId", "createdAt", "endAt", "id", "isDefault", "lastApprovedVersion", "name", "priority", "publishedAt", "rejectReason", "startAt", "status", "suspendReason", "suspendedAt", "suspendedBy", "updatedAt", "version" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
CREATE INDEX "Template_containerId_idx" ON "Template"("containerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
