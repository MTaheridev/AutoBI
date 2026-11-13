import { Injectable } from '@nestjs/common';
import { aiProviderRegistry } from '@autobi/ai';
import {
  dashboardProposalSchema,
  dashboardSpecSchema,
  proposeDashboardHeuristic,
  buildDashboardProposalPrompt,
  DASHBOARD_PROPOSAL_SYSTEM,
  type DashboardProposal,
  type DashboardSpec,
} from '@autobi/dashboard-engine';
import { buildSchemaContext } from '@autobi/semantic-engine';
import { buildCompiledQuery, queryPlanSchema, type QueryPlan } from '@autobi/query-engine';
import { AppError, NotFoundError, createId } from '@autobi/shared';
import type { AiProviderName, Prisma } from '@autobi/database';
import { PrismaService } from '../core/prisma.service.js';
import { EncryptionService } from '../core/encryption.service.js';
import { QueriesService } from '../queries/queries.service.js';

@Injectable()
export class DashboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly queries: QueriesService,
  ) {}

  private toDto(d: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    currentVersion: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: d.id,
      workspaceId: d.workspaceId,
      name: d.name,
      description: d.description,
      currentVersion: d.currentVersion,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }

  async list(workspaceId: string) {
    const items = await this.prisma.dashboard.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
    });
    return items.map((d) => this.toDto(d));
  }

  async get(workspaceId: string, id: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, workspaceId },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
    if (!dashboard) throw new NotFoundError('Dashboard not found');
    const current = dashboard.versions.find((v) => v.version === dashboard.currentVersion);
    return {
      dashboard: this.toDto(dashboard),
      spec: current?.spec ?? null,
      versions: dashboard.versions.map((v) => ({
        id: v.id,
        version: v.version,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  }

  async create(input: {
    workspaceId: string;
    name: string;
    description?: string;
    spec?: DashboardSpec;
  }) {
    const emptySpec = dashboardSpecSchema.parse(
      input.spec ?? {
        version: 1,
        title: input.name,
        description: input.description,
        layout: { columns: 12, rowHeight: 80 },
        widgets: [],
      },
    );

    const dashboard = await this.prisma.dashboard.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description,
        currentVersion: 1,
        versions: {
          create: {
            version: 1,
            spec: emptySpec as unknown as Prisma.InputJsonValue,
          },
        },
      },
    });

    return this.toDto(dashboard);
  }

  async update(
    workspaceId: string,
    id: string,
    input: { name?: string; description?: string | null; spec?: DashboardSpec },
  ) {
    const existing = await this.prisma.dashboard.findFirst({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundError('Dashboard not found');

    if (input.spec) {
      const spec = dashboardSpecSchema.parse(input.spec);
      const nextVersion = existing.currentVersion + 1;
      await this.prisma.$transaction([
        this.prisma.dashboardVersion.create({
          data: {
            dashboardId: id,
            version: nextVersion,
            spec: spec as unknown as Prisma.InputJsonValue,
          },
        }),
        this.prisma.dashboard.update({
          where: { id },
          data: {
            name: input.name ?? existing.name,
            description:
              input.description === undefined ? existing.description : input.description,
            currentVersion: nextVersion,
          },
        }),
      ]);
    } else {
      await this.prisma.dashboard.update({
        where: { id },
        data: {
          name: input.name ?? existing.name,
          description: input.description === undefined ? existing.description : input.description,
        },
      });
    }

    return this.get(workspaceId, id);
  }

  async delete(workspaceId: string, id: string) {
    const existing = await this.prisma.dashboard.findFirst({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundError('Dashboard not found');
    await this.prisma.dashboard.delete({ where: { id } });
    return { ok: true };
  }

  async getVersion(workspaceId: string, id: string, version: number) {
    const dashboard = await this.prisma.dashboard.findFirst({ where: { id, workspaceId } });
    if (!dashboard) throw new NotFoundError('Dashboard not found');
    const ver = await this.prisma.dashboardVersion.findUnique({
      where: { dashboardId_version: { dashboardId: id, version } },
    });
    if (!ver) throw new NotFoundError('Dashboard version not found');
    return {
      version: ver.version,
      spec: ver.spec,
      createdAt: ver.createdAt.toISOString(),
    };
  }

  private async loadSnapshot(dataSourceId: string, workspaceId: string) {
    const ds = await this.prisma.dataSource.findFirst({
      where: { id: dataSourceId, workspaceId },
    });
    if (!ds) throw new NotFoundError('Data source not found');
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
    const metadata = snapshot.metadata as unknown as {
      schemas: string[];
      tables: Array<{
        schema: string;
        name: string;
        type: 'table' | 'view';
        columns: Array<{
          name: string;
          dataType: string;
          isPrimaryKey?: boolean;
          isForeignKey?: boolean;
        }>;
      }>;
      relationships: Array<{
        sourceSchema: string;
        sourceTable: string;
        sourceColumn: string;
        targetSchema: string;
        targetTable: string;
        targetColumn: string;
      }>;
    };
    return { dataSource: ds, metadata };
  }

  private async resolveProposal(
    workspaceId: string,
    input: {
      dataSourceId: string;
      semanticModelId?: string;
      prompt: string;
      useAi?: boolean;
      provider?: AiProviderName;
    },
  ): Promise<{ proposal: DashboardProposal; source: 'ai' | 'inferred' }> {
    const { metadata } = await this.loadSnapshot(input.dataSourceId, workspaceId);
    const schemaContext = buildSchemaContext({
      schemas: metadata.schemas ?? [],
      tables: metadata.tables ?? [],
      relationships: metadata.relationships ?? [],
    });

    let approvedMetrics: Array<{ name: string; expression: string; aggregation: string }> = [];
    if (input.semanticModelId) {
      const metrics = await this.prisma.metric.findMany({
        where: {
          semanticModelId: input.semanticModelId,
          status: 'Approved',
          semanticModel: { workspaceId },
        },
      });
      approvedMetrics = metrics.map((m) => ({
        name: m.name,
        expression: m.expression,
        aggregation: m.aggregation,
      }));
    }

    if (input.useAi !== false) {
      const configs = await this.prisma.aIProviderConfig.findMany({ where: { workspaceId } });
      const config = input.provider
        ? configs.find((c) => c.provider === input.provider)
        : configs[0];
      if (config) {
        try {
          const apiKey = this.encryption.decrypt(config.encryptedKey);
          const provider = aiProviderRegistry.create(config.provider, apiKey);
          const result = await provider.generateStructured({
            model: config.model,
            system: DASHBOARD_PROPOSAL_SYSTEM,
            prompt: buildDashboardProposalPrompt({
              userPrompt: input.prompt,
              schemaContext,
              approvedMetrics,
            }),
            schema: dashboardProposalSchema,
            temperature: 0.2,
            maxTokens: 4000,
            timeoutMs: 45_000,
          });
          const proposal: DashboardProposal = {
            title: result.data.title,
            description: result.data.description,
            widgets: (result.data.widgets ?? []).map((w) => ({
              ...w,
              config: w.config ?? {},
            })),
          };
          return { proposal, source: 'ai' };
        } catch {
          // fall through
        }
      }
    }

    return {
      proposal: proposeDashboardHeuristic(metadata, input.prompt),
      source: 'inferred',
    };
  }

  async generate(input: {
    workspaceId: string;
    dataSourceId: string;
    semanticModelId?: string;
    prompt: string;
    useAi?: boolean;
    provider?: AiProviderName;
  }) {
    const { dataSource, metadata } = await this.loadSnapshot(
      input.dataSourceId,
      input.workspaceId,
    );
    const { proposal, source } = await this.resolveProposal(input.workspaceId, input);

    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId: input.workspaceId,
        dataSourceId: input.dataSourceId,
        title: input.prompt.slice(0, 80),
        messages: {
          create: [
            { role: 'user', content: input.prompt },
            {
              role: 'assistant',
              content: `Generated dashboard proposal via ${source}`,
              metadata: { source, widgetCount: proposal.widgets.length },
            },
          ],
        },
      },
    });

    const dashboard = await this.prisma.dashboard.create({
      data: {
        workspaceId: input.workspaceId,
        name: proposal.title,
        description: proposal.description,
        currentVersion: 1,
      },
    });

    const widgets: DashboardSpec['widgets'] = [];
    const tables = metadata.tables ?? [];
    const relationships = metadata.relationships ?? [];

    for (const w of proposal.widgets) {
      const plan: QueryPlan = queryPlanSchema.parse({
        dataSourceId: dataSource.id,
        metrics: [
          {
            expression: w.metricExpression,
            aggregation: w.aggregation,
            alias: 'value',
          },
        ],
        dimensions: w.dimensionField
          ? [{ field: w.dimensionField, alias: 'dimension' }]
          : [],
        filters: [],
        sort: [{ field: 'value', direction: 'DESC' }],
        limit: w.type === 'kpi' ? 1 : 100,
      });

      try {
        const compiled = buildCompiledQuery(plan, {
          dialect: dataSource.type,
          tables,
          relationships,
          preferApprovedSemantics: true,
        });

        const query = await this.prisma.queryDefinition.create({
          data: {
            workspaceId: input.workspaceId,
            dataSourceId: dataSource.id,
            semanticModelId: input.semanticModelId,
            dashboardId: dashboard.id,
            name: w.queryName,
            plan: plan as unknown as Prisma.InputJsonValue,
            compiledSql: compiled.sql,
            dialect: compiled.dialect,
          },
        });

        widgets.push({
          id: createId(),
          type: w.type,
          title: w.title,
          queryId: query.id,
          position: w.position,
          config: w.config ?? {},
        });
      } catch {
        // Skip widgets that fail validation/compile
      }
    }

    if (!widgets.length) {
      await this.prisma.dashboard.delete({ where: { id: dashboard.id } });
      throw new AppError(
        'Could not create any valid widgets from the proposal',
        'DASHBOARD_GENERATE_FAILED',
        400,
      );
    }

    const spec = dashboardSpecSchema.parse({
      version: 1,
      title: proposal.title,
      description: proposal.description,
      layout: { columns: 12, rowHeight: 80 },
      widgets,
    });

    await this.prisma.dashboardVersion.create({
      data: {
        dashboardId: dashboard.id,
        version: 1,
        spec: spec as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      dashboard: this.toDto(dashboard),
      spec,
      conversationId: conversation.id,
      proposalMeta: { source, widgetCount: widgets.length },
    };
  }

  async executeWidgetQuery(workspaceId: string, queryId: string) {
    return this.queries.execute(workspaceId, queryId);
  }

  /**
   * NL edit: generate a fresh proposal for the prompt and append new widgets
   * as a new dashboard version (keeps existing widgets).
   */
  async edit(input: {
    workspaceId: string;
    dashboardId: string;
    prompt: string;
    useAi?: boolean;
    provider?: AiProviderName;
  }) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id: input.dashboardId, workspaceId: input.workspaceId },
    });
    if (!dashboard) throw new NotFoundError('Dashboard not found');

    const current = await this.prisma.dashboardVersion.findFirst({
      where: { dashboardId: dashboard.id, version: dashboard.currentVersion },
    });
    if (!current) throw new NotFoundError('Dashboard version not found');

    const currentSpec = dashboardSpecSchema.parse(current.spec);
    const query = await this.prisma.queryDefinition.findFirst({
      where: { dashboardId: dashboard.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!query) {
      throw new AppError(
        'Dashboard has no queries to base an edit on',
        'DASHBOARD_EDIT_FAILED',
        400,
      );
    }

    const { proposal, source } = await this.resolveProposal(input.workspaceId, {
      dataSourceId: query.dataSourceId,
      semanticModelId: query.semanticModelId ?? undefined,
      prompt: input.prompt,
      useAi: input.useAi,
      provider: input.provider,
    });

    const newWidgets: DashboardSpec['widgets'] = [];
    const yOffset =
      currentSpec.widgets.reduce(
        (max, w) => Math.max(max, w.position.y + w.position.height),
        0,
      ) || 0;

    for (const [index, widget] of proposal.widgets.entries()) {
      try {
        const plan = queryPlanSchema.parse({
          dataSourceId: query.dataSourceId,
          metrics: [
            {
              expression: widget.metricExpression,
              aggregation: widget.aggregation,
              alias: 'value',
            },
          ],
          dimensions: widget.dimensionField
            ? [{ field: widget.dimensionField, alias: 'dimension' }]
            : [],
          filters: [],
          sort: [{ field: 'value', direction: 'DESC' }],
          limit: widget.type === 'kpi' ? 1 : 100,
        });
        const created = await this.queries.create({
          workspaceId: input.workspaceId,
          name: widget.queryName || `${dashboard.name} · ${widget.title}`,
          semanticModelId: query.semanticModelId ?? undefined,
          plan,
        });
        newWidgets.push({
          id: createId(),
          type: widget.type,
          title: widget.title,
          queryId: created.id,
          position: {
            x: widget.position?.x ?? (index % 2) * 6,
            y: yOffset + (widget.position?.y ?? Math.floor(index / 2) * 4),
            width: widget.position?.width ?? 6,
            height: widget.position?.height ?? 4,
          },
          config: widget.config ?? {},
        });
      } catch {
        // Skip invalid widgets
      }
    }

    if (!newWidgets.length) {
      throw new AppError(
        'Could not add any valid widgets from the edit prompt',
        'DASHBOARD_EDIT_FAILED',
        400,
      );
    }

    const nextVersion = dashboard.currentVersion + 1;
    const spec = dashboardSpecSchema.parse({
      ...currentSpec,
      widgets: [...currentSpec.widgets, ...newWidgets],
    });

    await this.prisma.conversation.create({
      data: {
        workspaceId: input.workspaceId,
        dataSourceId: query.dataSourceId,
        title: `Edit: ${input.prompt.slice(0, 60)}`,
        messages: {
          create: [
            { role: 'user', content: input.prompt },
            {
              role: 'assistant',
              content: `Added ${newWidgets.length} widget(s) via ${source}`,
            },
          ],
        },
      },
    });

    await this.prisma.dashboardVersion.create({
      data: {
        dashboardId: dashboard.id,
        version: nextVersion,
        spec: spec as unknown as Prisma.InputJsonValue,
      },
    });
    const updated = await this.prisma.dashboard.update({
      where: { id: dashboard.id },
      data: { currentVersion: nextVersion },
    });

    return {
      dashboard: this.toDto(updated),
      spec,
      proposalMeta: { source, addedWidgets: newWidgets.length },
    };
  }
}
