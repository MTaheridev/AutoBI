-- CreateEnum
CREATE TYPE "QueryRunStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "QueryDefinition" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "dataSourceId" UUID NOT NULL,
    "semanticModelId" UUID,
    "name" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "compiledSql" TEXT,
    "dialect" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueryDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryRun" (
    "id" UUID NOT NULL,
    "queryDefinitionId" UUID NOT NULL,
    "status" "QueryRunStatus" NOT NULL DEFAULT 'queued',
    "durationMs" INTEGER,
    "rowCount" INTEGER,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "resultPreview" JSONB,
    "compiledSql" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QueryDefinition_workspaceId_idx" ON "QueryDefinition"("workspaceId");

-- CreateIndex
CREATE INDEX "QueryDefinition_dataSourceId_idx" ON "QueryDefinition"("dataSourceId");

-- CreateIndex
CREATE INDEX "QueryRun_queryDefinitionId_idx" ON "QueryRun"("queryDefinitionId");

-- CreateIndex
CREATE INDEX "QueryRun_status_idx" ON "QueryRun"("status");

-- AddForeignKey
ALTER TABLE "QueryDefinition" ADD CONSTRAINT "QueryDefinition_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDefinition" ADD CONSTRAINT "QueryDefinition_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryRun" ADD CONSTRAINT "QueryRun_queryDefinitionId_fkey" FOREIGN KEY ("queryDefinitionId") REFERENCES "QueryDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
