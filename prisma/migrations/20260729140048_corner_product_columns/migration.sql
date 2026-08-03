-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Corner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cornerType" TEXT NOT NULL,
    "title" TEXT,
    "maxItems" INTEGER,
    "sortStrategy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "markupId" TEXT,
    "layoutDetail" TEXT,
    "cornerLayout" TEXT,
    "description" TEXT,
    "mainTitle" TEXT,
    "subTitle" TEXT,
    "subTitleIcon" TEXT,
    "minItems" INTEGER,
    "noDisplayCondition" TEXT,
    "moreButtonUse" BOOLEAN NOT NULL DEFAULT false,
    "moreButtonLabel" TEXT,
    "moreButtonLink" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Corner" ("cornerLayout", "cornerType", "createdAt", "description", "id", "layoutDetail", "mainTitle", "markupId", "maxItems", "name", "sortStrategy", "status", "subTitle", "subTitleIcon", "title", "updatedAt") SELECT "cornerLayout", "cornerType", "createdAt", "description", "id", "layoutDetail", "mainTitle", "markupId", "maxItems", "name", "sortStrategy", "status", "subTitle", "subTitleIcon", "title", "updatedAt" FROM "Corner";
DROP TABLE "Corner";
ALTER TABLE "new_Corner" RENAME TO "Corner";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
