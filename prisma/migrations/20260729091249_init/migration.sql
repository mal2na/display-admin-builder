-- CreateTable
CREATE TABLE "Atom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "atomType" TEXT NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "altText" TEXT,
    "linkUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComponentAtom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "atomId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ComponentAtom_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComponentAtom_atomId_fkey" FOREIGN KEY ("atomId") REFERENCES "Atom" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Corner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cornerType" TEXT NOT NULL,
    "title" TEXT,
    "maxItems" INTEGER,
    "sortStrategy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CornerComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cornerId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "CornerComponent_cornerId_fkey" FOREIGN KEY ("cornerId") REFERENCES "Corner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CornerComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "containerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conditionGroup" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "rejectReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Template_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "Container" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateCorner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "cornerId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "TemplateCorner_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateCorner_cornerId_fkey" FOREIGN KEY ("cornerId") REFERENCES "Corner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "containerType" TEXT,
    "channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "defaultTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Container_defaultTemplateId_fkey" FOREIGN KEY ("defaultTemplateId") REFERENCES "Template" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CornerComponentRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cornerType" TEXT NOT NULL,
    "componentType" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "reason" TEXT,
    "approver" TEXT,
    "result" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "ComponentAtom_componentId_idx" ON "ComponentAtom"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentAtom_componentId_atomId_key" ON "ComponentAtom"("componentId", "atomId");

-- CreateIndex
CREATE INDEX "CornerComponent_cornerId_idx" ON "CornerComponent"("cornerId");

-- CreateIndex
CREATE UNIQUE INDEX "CornerComponent_cornerId_componentId_key" ON "CornerComponent"("cornerId", "componentId");

-- CreateIndex
CREATE INDEX "Template_containerId_idx" ON "Template"("containerId");

-- CreateIndex
CREATE INDEX "TemplateCorner_templateId_idx" ON "TemplateCorner"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateCorner_templateId_cornerId_key" ON "TemplateCorner"("templateId", "cornerId");

-- CreateIndex
CREATE UNIQUE INDEX "Container_defaultTemplateId_key" ON "Container"("defaultTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "CornerComponentRule_cornerType_componentType_key" ON "CornerComponentRule"("cornerType", "componentType");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_changedAt_idx" ON "AuditLog"("changedAt");
