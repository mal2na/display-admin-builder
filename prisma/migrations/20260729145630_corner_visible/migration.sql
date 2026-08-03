-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TemplateCorner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "cornerId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "TemplateCorner_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateCorner_cornerId_fkey" FOREIGN KEY ("cornerId") REFERENCES "Corner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TemplateCorner" ("cornerId", "id", "order", "templateId") SELECT "cornerId", "id", "order", "templateId" FROM "TemplateCorner";
DROP TABLE "TemplateCorner";
ALTER TABLE "new_TemplateCorner" RENAME TO "TemplateCorner";
CREATE INDEX "TemplateCorner_templateId_idx" ON "TemplateCorner"("templateId");
CREATE UNIQUE INDEX "TemplateCorner_templateId_cornerId_key" ON "TemplateCorner"("templateId", "cornerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
