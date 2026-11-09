-- CreateEnum
CREATE TYPE "SemanticStatus" AS ENUM ('Proposed', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "SemanticSource" AS ENUM ('ai', 'user', 'inferred');

-- CreateTable
CREATE TABLE "SemanticModel" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "dataSourceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemanticModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemanticEntity" (
    "id" UUID NOT NULL,
    "semanticModelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tableRef" TEXT NOT NULL,
    "status" "SemanticStatus" NOT NULL DEFAULT 'Proposed',
    "source" "SemanticSource" NOT NULL DEFAULT 'ai',
    "definition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemanticEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" UUID NOT NULL,
    "semanticModelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expression" TEXT NOT NULL,
    "aggregation" TEXT NOT NULL,
    "entityName" TEXT,
    "status" "SemanticStatus" NOT NULL DEFAULT 'Proposed',
    "source" "SemanticSource" NOT NULL DEFAULT 'ai',
    "definition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dimension" (
    "id" UUID NOT NULL,
    "semanticModelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "field" TEXT NOT NULL,
    "entityName" TEXT,
    "status" "SemanticStatus" NOT NULL DEFAULT 'Proposed',
    "source" "SemanticSource" NOT NULL DEFAULT 'ai',
    "definition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemanticRelationship" (
    "id" UUID NOT NULL,
    "semanticModelId" UUID NOT NULL,
    "name" TEXT,
    "fromEntity" TEXT NOT NULL,
    "toEntity" TEXT NOT NULL,
    "fromField" TEXT NOT NULL,
    "toField" TEXT NOT NULL,
    "status" "SemanticStatus" NOT NULL DEFAULT 'Proposed',
    "source" "SemanticSource" NOT NULL DEFAULT 'ai',
    "definition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemanticRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SemanticModel_workspaceId_idx" ON "SemanticModel"("workspaceId");

-- CreateIndex
CREATE INDEX "SemanticModel_dataSourceId_idx" ON "SemanticModel"("dataSourceId");

-- CreateIndex
CREATE INDEX "SemanticEntity_semanticModelId_idx" ON "SemanticEntity"("semanticModelId");

-- CreateIndex
CREATE INDEX "SemanticEntity_semanticModelId_status_idx" ON "SemanticEntity"("semanticModelId", "status");

-- CreateIndex
CREATE INDEX "Metric_semanticModelId_idx" ON "Metric"("semanticModelId");

-- CreateIndex
CREATE INDEX "Metric_semanticModelId_status_idx" ON "Metric"("semanticModelId", "status");

-- CreateIndex
CREATE INDEX "Dimension_semanticModelId_idx" ON "Dimension"("semanticModelId");

-- CreateIndex
CREATE INDEX "Dimension_semanticModelId_status_idx" ON "Dimension"("semanticModelId", "status");

-- CreateIndex
CREATE INDEX "SemanticRelationship_semanticModelId_idx" ON "SemanticRelationship"("semanticModelId");

-- CreateIndex
CREATE INDEX "SemanticRelationship_semanticModelId_status_idx" ON "SemanticRelationship"("semanticModelId", "status");

-- AddForeignKey
ALTER TABLE "SemanticModel" ADD CONSTRAINT "SemanticModel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemanticModel" ADD CONSTRAINT "SemanticModel_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemanticEntity" ADD CONSTRAINT "SemanticEntity_semanticModelId_fkey" FOREIGN KEY ("semanticModelId") REFERENCES "SemanticModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_semanticModelId_fkey" FOREIGN KEY ("semanticModelId") REFERENCES "SemanticModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dimension" ADD CONSTRAINT "Dimension_semanticModelId_fkey" FOREIGN KEY ("semanticModelId") REFERENCES "SemanticModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemanticRelationship" ADD CONSTRAINT "SemanticRelationship_semanticModelId_fkey" FOREIGN KEY ("semanticModelId") REFERENCES "SemanticModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
