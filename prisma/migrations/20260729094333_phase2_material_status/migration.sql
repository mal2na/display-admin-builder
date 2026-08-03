-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Atom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "atomType" TEXT NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "altText" TEXT,
    "linkUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Atom" ("altText", "atomType", "content", "createdAt", "id", "imageUrl", "linkUrl", "name", "updatedAt") SELECT "altText", "atomType", "content", "createdAt", "id", "imageUrl", "linkUrl", "name", "updatedAt" FROM "Atom";
DROP TABLE "Atom";
ALTER TABLE "new_Atom" RENAME TO "Atom";
CREATE TABLE "new_Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "allowedCornerTypes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Component" ("componentType", "createdAt", "description", "id", "name", "updatedAt") SELECT "componentType", "createdAt", "description", "id", "name", "updatedAt" FROM "Component";
DROP TABLE "Component";
ALTER TABLE "new_Component" RENAME TO "Component";
CREATE TABLE "new_Corner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cornerType" TEXT NOT NULL,
    "title" TEXT,
    "maxItems" INTEGER,
    "sortStrategy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Corner" ("cornerType", "createdAt", "id", "maxItems", "name", "sortStrategy", "title", "updatedAt") SELECT "cornerType", "createdAt", "id", "maxItems", "name", "sortStrategy", "title", "updatedAt" FROM "Corner";
DROP TABLE "Corner";
ALTER TABLE "new_Corner" RENAME TO "Corner";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
