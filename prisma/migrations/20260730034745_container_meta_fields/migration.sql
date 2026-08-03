-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Container" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "containerType" TEXT,
    "channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "parentId" TEXT,
    "kind" TEXT NOT NULL DEFAULT '일반',
    "platform" TEXT NOT NULL DEFAULT '모바일',
    "previewUrl" TEXT,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "noEndDate" BOOLEAN NOT NULL DEFAULT false,
    "metaUse" BOOLEAN NOT NULL DEFAULT true,
    "searchTags" TEXT,
    "metaKeywords" TEXT,
    "metaDescription" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogSiteName" TEXT,
    "ogImage" TEXT,
    "defaultTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Container_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Container" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Container_defaultTemplateId_fkey" FOREIGN KEY ("defaultTemplateId") REFERENCES "Template" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Container" ("channel", "containerType", "createdAt", "defaultTemplateId", "id", "name", "status", "updatedAt") SELECT "channel", "containerType", "createdAt", "defaultTemplateId", "id", "name", "status", "updatedAt" FROM "Container";
DROP TABLE "Container";
ALTER TABLE "new_Container" RENAME TO "Container";
CREATE UNIQUE INDEX "Container_defaultTemplateId_key" ON "Container"("defaultTemplateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
