-- CreateTable
CREATE TABLE "CornerType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "typeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCategory" TEXT NOT NULL,
    "markupId" TEXT,
    "typeDetail" TEXT,
    "layout" TEXT,
    "description" TEXT,
    "channels" TEXT NOT NULL DEFAULT '전체',
    "platforms" TEXT NOT NULL DEFAULT '모바일',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "useMainTitle" BOOLEAN NOT NULL DEFAULT true,
    "useSubTitle" BOOLEAN NOT NULL DEFAULT true,
    "useMinItems" BOOLEAN NOT NULL DEFAULT true,
    "useMaxItems" BOOLEAN NOT NULL DEFAULT true,
    "useNoDisplay" BOOLEAN NOT NULL DEFAULT true,
    "useMoreButton" BOOLEAN NOT NULL DEFAULT true,
    "sampleImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CornerType_typeId_key" ON "CornerType"("typeId");
