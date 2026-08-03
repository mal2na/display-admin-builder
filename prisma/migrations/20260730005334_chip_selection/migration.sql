-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "selectedIndex" INTEGER NOT NULL DEFAULT 0,
    "allowedCornerTypes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Component" ("allowedCornerTypes", "componentType", "createdAt", "description", "id", "name", "status", "updatedAt") SELECT "allowedCornerTypes", "componentType", "createdAt", "description", "id", "name", "status", "updatedAt" FROM "Component";
DROP TABLE "Component";
ALTER TABLE "new_Component" RENAME TO "Component";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
