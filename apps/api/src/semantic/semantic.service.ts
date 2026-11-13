import { Injectable } from '@nestjs/common';
import { aiProviderRegistry } from '@autobi/ai';
import {
  buildSemanticProposalPrompt,
  canTransition,
  proposeFromSchemaHeuristic,
  SEMANTIC_PROPOSAL_SYSTEM,
  semanticProposalSchema,
  validateProposalAgainstSnapshot,
  type SchemaSnapshotSummary,
  type SemanticProposal,
} from '@autobi/semantic-engine';
import { AppError, NotFoundError, ValidationError } from '@autobi/shared';
import type { AiProviderName, Prisma, SemanticStatus } from '@autobi/database';
import { PrismaService } from '../core/prisma.service.js';
import { EncryptionService } from '../core/encryption.service.js';
import { AuditService } from '../core/audit.service.js';

@Injectable()
export class SemanticService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  private async auditStatus(
    workspaceId: string,
    kind: string,
    itemId: string,
    status: SemanticStatus,
    actorId?: string,
  ) {
    await this.audit.record({
      action: `semantic.${kind}.${status.toLowerCase()}`,
      actorId,
      workspaceId,
      metadata: { itemId, status },
    });
  }

  private toModelDto(model: {
    id: string;
    workspaceId: string;
    dataSourceId: string;
    name: string;
    description: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    _count?: { entities: number; metrics: number; dimensions: number; relationships: number };
  }) {
    return {
      id: model.id,
      workspaceId: model.workspaceId,
      dataSourceId: model.dataSourceId,
      name: model.name,
      description: model.description,
      version: model.version,
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
      counts: model._count
        ? {
            entities: model._count.entities,
            metrics: model._count.metrics,
            dimensions: model._count.dimensions,
            relationships: model._count.relationships,
          }
        : undefined,
    };
  }

  private toItemDto<T extends { createdAt: Date; updatedAt: Date }>(item: T) {
    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async create(input: {
    workspaceId: string;
    dataSourceId: string;
    name: string;
    description?: string;
  }) {
    const ds = await this.prisma.dataSource.findFirst({
      where: { id: input.dataSourceId, workspaceId: input.workspaceId },
    });
    if (!ds) throw new NotFoundError('Data source not found');

    const model = await this.prisma.semanticModel.create({
      data: {
        workspaceId: input.workspaceId,
        dataSourceId: input.dataSourceId,
        name: input.name,
        description: input.description,
      },
      include: {
        _count: { select: { entities: true, metrics: true, dimensions: true, relationships: true } },
      },
    });
    return this.toModelDto(model);
  }

  async list(workspaceId: string) {
    const models = await this.prisma.semanticModel.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { entities: true, metrics: true, dimensions: true, relationships: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return models.map((m) => this.toModelDto(m));
  }

  async get(workspaceId: string, id: string) {
    const model = await this.prisma.semanticModel.findFirst({
      where: { id, workspaceId },
      include: {
        entities: { orderBy: { name: 'asc' } },
        metrics: { orderBy: { name: 'asc' } },
        dimensions: { orderBy: { name: 'asc' } },
        relationships: { orderBy: { createdAt: 'asc' } },
        _count: { select: { entities: true, metrics: true, dimensions: true, relationships: true } },
      },
    });
    if (!model) throw new NotFoundError('Semantic model not found');

    return {
      model: this.toModelDto(model),
      entities: model.entities.map((e) => this.toItemDto(e)),
      metrics: model.metrics.map((m) => this.toItemDto(m)),
      dimensions: model.dimensions.map((d) => this.toItemDto(d)),
      relationships: model.relationships.map((r) => this.toItemDto(r)),
    };
  }

  async delete(workspaceId: string, id: string) {
    const model = await this.prisma.semanticModel.findFirst({ where: { id, workspaceId } });
    if (!model) throw new NotFoundError('Semantic model not found');
    await this.prisma.semanticModel.delete({ where: { id } });
    return { ok: true };
  }

  private async loadSnapshot(dataSourceId: string): Promise<SchemaSnapshotSummary> {
    const snapshot = await this.prisma.schemaSnapshot.findFirst({
      where: { dataSourceId },
      orderBy: { version: 'desc' },
    });
    if (!snapshot) {
      throw new AppError(
        'No schema snapshot found. Run introspection first.',
        'SCHEMA_REQUIRED',
        400,
      );
    }
    const metadata = snapshot.metadata as unknown as SchemaSnapshotSummary;
    return {
      schemas: metadata.schemas ?? [],
      tables: metadata.tables ?? [],
      relationships: metadata.relationships ?? [],
    };
  }

  private async resolveAiProvider(workspaceId: string, providerName?: AiProviderName) {
    const configs = await this.prisma.aIProviderConfig.findMany({ where: { workspaceId } });
    const config = providerName
      ? configs.find((c) => c.provider === providerName)
      : configs[0];
    if (!config) return null;
    const apiKey = this.encryption.decrypt(config.encryptedKey);
    return {
      provider: aiProviderRegistry.create(config.provider, apiKey),
      model: config.model,
      name: config.provider,
    };
  }

  private async generateProposal(
    workspaceId: string,
    snapshot: SchemaSnapshotSummary,
    options: { useAi?: boolean; provider?: AiProviderName },
  ): Promise<{ proposal: SemanticProposal; source: 'ai' | 'inferred'; provider?: string }> {
    if (options.useAi !== false) {
      const ai = await this.resolveAiProvider(workspaceId, options.provider);
      if (ai) {
        try {
          const result = await ai.provider.generateStructured({
            model: ai.model,
            system: SEMANTIC_PROPOSAL_SYSTEM,
            prompt: buildSemanticProposalPrompt(snapshot),
            schema: semanticProposalSchema,
            temperature: 0.1,
            maxTokens: 4000,
            timeoutMs: 45_000,
          });
          const proposal: SemanticProposal = {
            entities: result.data.entities ?? [],
            metrics: result.data.metrics ?? [],
            dimensions: result.data.dimensions ?? [],
            relationships: result.data.relationships ?? [],
          };
          return { proposal, source: 'ai', provider: ai.name };
        } catch {
          // Fall through to heuristic
        }
      }
    }

    return {
      proposal: proposeFromSchemaHeuristic(snapshot),
      source: 'inferred',
    };
  }

  async propose(
    workspaceId: string,
    id: string,
    options: { useAi?: boolean; provider?: AiProviderName } = {},
  ) {
    const model = await this.prisma.semanticModel.findFirst({
      where: { id, workspaceId },
    });
    if (!model) throw new NotFoundError('Semantic model not found');

    const snapshot = await this.loadSnapshot(model.dataSourceId);
    const { proposal, source, provider } = await this.generateProposal(
      workspaceId,
      snapshot,
      options,
    );
    validateProposalAgainstSnapshot(proposal, snapshot);

    await this.prisma.$transaction(async (tx) => {
      await tx.semanticEntity.deleteMany({
        where: { semanticModelId: id, status: 'Proposed' },
      });
      await tx.metric.deleteMany({ where: { semanticModelId: id, status: 'Proposed' } });
      await tx.dimension.deleteMany({ where: { semanticModelId: id, status: 'Proposed' } });
      await tx.semanticRelationship.deleteMany({
        where: { semanticModelId: id, status: 'Proposed' },
      });

      if (proposal.entities.length) {
        await tx.semanticEntity.createMany({
          data: proposal.entities.map((e) => ({
            semanticModelId: id,
            name: e.name,
            description: e.description,
            tableRef: e.tableRef,
            status: 'Proposed',
            source,
            definition: e as unknown as Prisma.InputJsonValue,
          })),
        });
      }
      if (proposal.metrics.length) {
        await tx.metric.createMany({
          data: proposal.metrics.map((m) => ({
            semanticModelId: id,
            name: m.name,
            description: m.description,
            expression: m.expression,
            aggregation: m.aggregation,
            entityName: m.entityName,
            status: 'Proposed',
            source,
            definition: m as unknown as Prisma.InputJsonValue,
          })),
        });
      }
      if (proposal.dimensions.length) {
        await tx.dimension.createMany({
          data: proposal.dimensions.map((d) => ({
            semanticModelId: id,
            name: d.name,
            description: d.description,
            field: d.field,
            entityName: d.entityName,
            status: 'Proposed',
            source,
            definition: d as unknown as Prisma.InputJsonValue,
          })),
        });
      }
      if (proposal.relationships.length) {
        await tx.semanticRelationship.createMany({
          data: proposal.relationships.map((r) => ({
            semanticModelId: id,
            name: r.name,
            fromEntity: r.fromEntity,
            toEntity: r.toEntity,
            fromField: r.fromField,
            toField: r.toField,
            status: 'Proposed',
            source,
            definition: r as unknown as Prisma.InputJsonValue,
          })),
        });
      }

      await tx.semanticModel.update({
        where: { id },
        data: { version: { increment: 1 } },
      });
    });

    const detail = await this.get(workspaceId, id);
    return {
      ...detail,
      proposalMeta: {
        source,
        provider: provider ?? null,
        counts: {
          entities: proposal.entities.length,
          metrics: proposal.metrics.length,
          dimensions: proposal.dimensions.length,
          relationships: proposal.relationships.length,
        },
      },
    };
  }

  private assertTransition(from: SemanticStatus, to: SemanticStatus) {
    if (!canTransition(from, to)) {
      throw new ValidationError(`Cannot transition from ${from} to ${to}`);
    }
  }

  async updateEntityStatus(
    workspaceId: string,
    modelId: string,
    itemId: string,
    status: SemanticStatus,
    actorId?: string,
  ) {
    await this.requireModel(workspaceId, modelId);
    const item = await this.prisma.semanticEntity.findFirst({
      where: { id: itemId, semanticModelId: modelId },
    });
    if (!item) throw new NotFoundError('Entity not found');
    this.assertTransition(item.status, status);
    const updated = await this.prisma.semanticEntity.update({
      where: { id: itemId },
      data: { status },
    });
    await this.auditStatus(workspaceId, 'entity', itemId, status, actorId);
    return this.toItemDto(updated);
  }

  async updateMetricStatus(
    workspaceId: string,
    modelId: string,
    itemId: string,
    status: SemanticStatus,
    actorId?: string,
  ) {
    await this.requireModel(workspaceId, modelId);
    const item = await this.prisma.metric.findFirst({
      where: { id: itemId, semanticModelId: modelId },
    });
    if (!item) throw new NotFoundError('Metric not found');
    this.assertTransition(item.status, status);
    const updated = await this.prisma.metric.update({
      where: { id: itemId },
      data: { status },
    });
    await this.auditStatus(workspaceId, 'metric', itemId, status, actorId);
    return this.toItemDto(updated);
  }

  async updateDimensionStatus(
    workspaceId: string,
    modelId: string,
    itemId: string,
    status: SemanticStatus,
    actorId?: string,
  ) {
    await this.requireModel(workspaceId, modelId);
    const item = await this.prisma.dimension.findFirst({
      where: { id: itemId, semanticModelId: modelId },
    });
    if (!item) throw new NotFoundError('Dimension not found');
    this.assertTransition(item.status, status);
    const updated = await this.prisma.dimension.update({
      where: { id: itemId },
      data: { status },
    });
    await this.auditStatus(workspaceId, 'dimension', itemId, status, actorId);
    return this.toItemDto(updated);
  }

  async updateRelationshipStatus(
    workspaceId: string,
    modelId: string,
    itemId: string,
    status: SemanticStatus,
    actorId?: string,
  ) {
    await this.requireModel(workspaceId, modelId);
    const item = await this.prisma.semanticRelationship.findFirst({
      where: { id: itemId, semanticModelId: modelId },
    });
    if (!item) throw new NotFoundError('Relationship not found');
    this.assertTransition(item.status, status);
    const updated = await this.prisma.semanticRelationship.update({
      where: { id: itemId },
      data: { status },
    });
    await this.auditStatus(workspaceId, 'relationship', itemId, status, actorId);
    return this.toItemDto(updated);
  }

  async createMetric(
    workspaceId: string,
    modelId: string,
    input: {
      name: string;
      description?: string;
      expression: string;
      aggregation: string;
      entityName?: string;
    },
  ) {
    await this.requireModel(workspaceId, modelId);
    const created = await this.prisma.metric.create({
      data: {
        semanticModelId: modelId,
        name: input.name,
        description: input.description,
        expression: input.expression,
        aggregation: input.aggregation,
        entityName: input.entityName,
        status: 'Proposed',
        source: 'user',
        definition: input as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toItemDto(created);
  }

  async createDimension(
    workspaceId: string,
    modelId: string,
    input: {
      name: string;
      description?: string;
      field: string;
      entityName?: string;
    },
  ) {
    await this.requireModel(workspaceId, modelId);
    const created = await this.prisma.dimension.create({
      data: {
        semanticModelId: modelId,
        name: input.name,
        description: input.description,
        field: input.field,
        entityName: input.entityName,
        status: 'Proposed',
        source: 'user',
        definition: input as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toItemDto(created);
  }

  async createEntity(
    workspaceId: string,
    modelId: string,
    input: { name: string; description?: string; tableRef: string },
  ) {
    await this.requireModel(workspaceId, modelId);
    const created = await this.prisma.semanticEntity.create({
      data: {
        semanticModelId: modelId,
        name: input.name,
        description: input.description,
        tableRef: input.tableRef,
        status: 'Proposed',
        source: 'user',
        definition: input as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toItemDto(created);
  }

  async createRelationship(
    workspaceId: string,
    modelId: string,
    input: {
      name?: string;
      fromEntity: string;
      toEntity: string;
      fromField: string;
      toField: string;
    },
  ) {
    await this.requireModel(workspaceId, modelId);
    const created = await this.prisma.semanticRelationship.create({
      data: {
        semanticModelId: modelId,
        name: input.name,
        fromEntity: input.fromEntity,
        toEntity: input.toEntity,
        fromField: input.fromField,
        toField: input.toField,
        status: 'Proposed',
        source: 'user',
        definition: input as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toItemDto(created);
  }

  async bulkSetStatus(
    workspaceId: string,
    modelId: string,
    kind: 'entities' | 'metrics' | 'dimensions' | 'relationships',
    fromStatus: SemanticStatus,
    toStatus: SemanticStatus,
  ) {
    await this.requireModel(workspaceId, modelId);
    this.assertTransition(fromStatus, toStatus);

    if (kind === 'entities') {
      const result = await this.prisma.semanticEntity.updateMany({
        where: { semanticModelId: modelId, status: fromStatus },
        data: { status: toStatus },
      });
      return { updated: result.count };
    }
    if (kind === 'metrics') {
      const result = await this.prisma.metric.updateMany({
        where: { semanticModelId: modelId, status: fromStatus },
        data: { status: toStatus },
      });
      return { updated: result.count };
    }
    if (kind === 'dimensions') {
      const result = await this.prisma.dimension.updateMany({
        where: { semanticModelId: modelId, status: fromStatus },
        data: { status: toStatus },
      });
      return { updated: result.count };
    }
    const result = await this.prisma.semanticRelationship.updateMany({
      where: { semanticModelId: modelId, status: fromStatus },
      data: { status: toStatus },
    });
    return { updated: result.count };
  }

  private async requireModel(workspaceId: string, id: string) {
    const model = await this.prisma.semanticModel.findFirst({ where: { id, workspaceId } });
    if (!model) throw new NotFoundError('Semantic model not found');
    return model;
  }
}
