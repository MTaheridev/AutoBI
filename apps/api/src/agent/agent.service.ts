import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  aiProviderRegistry,
  type AgentMessage,
  type AgentToolCall,
} from '@autobi/ai';
import { registerBuiltinAiProviders } from '@autobi/ai-providers';
import type { AiProviderName, Prisma } from '@autobi/database';
import { AppError, NotFoundError, ValidationError } from '@autobi/shared';
import { PrismaService } from '../core/prisma.service.js';
import { EncryptionService } from '../core/encryption.service.js';
import { DataSourcesService } from '../data-sources/data-sources.service.js';
import { SemanticService } from '../semantic/semantic.service.js';
import { QueriesService } from '../queries/queries.service.js';
import { DashboardsService } from '../dashboards/dashboards.service.js';
import {
  AGENT_TOOL_DEFINITIONS,
  runAgentTool,
  type AgentAskPayload,
  type AgentToolContext,
} from './agent.tools.js';
import { buildAgentSystemPrompt } from './skills/load-skills.js';
import { redactSecrets, redactText } from './redact.js';

export type AgentSseEvent =
  | { type: 'status'; message: string }
  | {
      type: 'tool_start';
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }
  | {
      type: 'tool_end';
      id: string;
      name: string;
      ok: boolean;
      latencyMs: number;
      result: unknown;
      error?: string;
      artifacts?: Array<{ type: string; id: string; label?: string }>;
    }
  | {
      type: 'artifact';
      artifact: { type: string; id: string; label?: string };
    }
  | { type: 'message'; role: 'assistant'; content: string }
  | {
      type: 'ask';
      askId: string;
      question: string;
      options: Array<{ id: string; label: string }>;
      allowMultiple: boolean;
    }
  | { type: 'awaiting_input'; conversationId: string; askId: string }
  | {
      type: 'done';
      conversationId: string;
      artifacts: Array<{ type: string; id: string; label?: string }>;
    }
  | { type: 'error'; message: string };

const MAX_TURNS = 20;

type PendingAskMeta = AgentAskPayload & { answered?: boolean };

@Injectable()
export class AgentService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly dataSources: DataSourcesService,
    private readonly semantic: SemanticService,
    private readonly queries: QueriesService,
    private readonly dashboards: DashboardsService,
  ) {}

  onModuleInit() {
    registerBuiltinAiProviders();
  }

  async listConversations(workspaceId: string) {
    const items = await this.prisma.conversation.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return items.map((c) => ({
      id: c.id,
      title: c.title,
      dataSourceId: c.dataSourceId,
      updatedAt: c.updatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      preview: c.messages[0]?.content?.slice(0, 120) ?? null,
    }));
  }

  async createConversation(input: {
    workspaceId: string;
    title?: string;
    dataSourceId?: string;
  }) {
    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId: input.workspaceId,
        title: input.title ?? 'New agent chat',
        dataSourceId: input.dataSourceId,
      },
    });
    return {
      id: conversation.id,
      title: conversation.title,
      dataSourceId: conversation.dataSourceId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  async getConversation(workspaceId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, workspaceId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) throw new NotFoundError('Conversation not found');

    const pendingAsk = this.findPendingAsk(
      conversation.messages.map((m) => ({
        metadata: m.metadata as Record<string, unknown> | null,
      })),
    );

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        dataSourceId: conversation.dataSourceId,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        pendingAsk: pendingAsk
          ? {
              askId: pendingAsk.askId,
              question: pendingAsk.question,
              options: pendingAsk.options,
              allowMultiple: pendingAsk.allowMultiple,
            }
          : null,
      },
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async deleteConversation(workspaceId: string, id: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundError('Conversation not found');
    await this.prisma.conversation.delete({ where: { id } });
    return { ok: true };
  }

  private async resolveProvider(workspaceId: string, provider?: AiProviderName) {
    const configs = await this.prisma.aIProviderConfig.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    const config = provider
      ? configs.find((c) => c.provider === provider)
      : configs.find((c) => c.provider === 'gemini') ?? configs[0];
    if (!config) {
      throw new AppError(
        'No AI provider configured. Add a Gemini, OpenAI, or OpenRouter key in Agent Mode or AI settings.',
        'AI_CONFIG_REQUIRED',
        400,
      );
    }
    const apiKey = this.encryption.decrypt(config.encryptedKey);
    return {
      provider: aiProviderRegistry.create(config.provider, apiKey),
      model: config.model,
      providerName: config.provider,
    };
  }

  private findPendingAsk(
    messages: Array<{ metadata: Record<string, unknown> | null }>,
  ): PendingAskMeta | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const meta = messages[i]?.metadata;
      const pending = meta?.pendingAsk as PendingAskMeta | undefined;
      if (pending?.askId && !pending.answered) return pending;
    }
    return null;
  }

  private async loadGroundedIds(conversationId: string): Promise<Set<string>> {
    const grounded = new Set<string>();
    const toolMsgs = await this.prisma.message.findMany({
      where: { conversationId, role: 'tool' },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    for (const m of toolMsgs) {
      const meta = m.metadata as Record<string, unknown> | null;
      const name = meta?.name as string | undefined;
      if (name !== 'get_to_know_datasource' && name !== 'sample_table_rows') continue;
      try {
        const parsed = JSON.parse(m.content) as {
          ok?: boolean;
          data?: { dataSourceId?: string };
        };
        if (!parsed.ok) continue;
        const dsId = parsed.data?.dataSourceId;
        if (typeof dsId === 'string') grounded.add(dsId);
        // sample_table_rows payload may not include dataSourceId; check args in metadata
        const args = meta?.arguments as { dataSourceId?: string } | undefined;
        if (args?.dataSourceId) grounded.add(args.dataSourceId);
      } catch {
        // ignore
      }
    }
    return grounded;
  }

  private makeToolCtx(
    workspaceId: string,
    userId: string,
    grounded: Set<string>,
  ): AgentToolContext {
    return {
      workspaceId,
      userId,
      prisma: this.prisma,
      dataSources: this.dataSources,
      semantic: this.semantic,
      queries: this.queries,
      dashboards: this.dashboards,
      groundedDataSourceIds: grounded,
    };
  }

  private async rebuildMessages(
    conversationId: string,
    activeUserMessageId?: string,
    activeUserRaw?: string,
  ): Promise<AgentMessage[]> {
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    rows.reverse();

    const out: AgentMessage[] = [{ role: 'system', content: buildAgentSystemPrompt() }];

    for (const m of rows) {
      if (m.role === 'user') {
        out.push({
          role: 'user',
          content:
            activeUserMessageId && m.id === activeUserMessageId && activeUserRaw
              ? activeUserRaw
              : m.content,
        });
      } else if (m.role === 'assistant') {
        const meta = m.metadata as { toolCalls?: AgentToolCall[] } | null;
        out.push({
          role: 'assistant',
          content: m.content || '',
          toolCalls: meta?.toolCalls,
        });
      } else if (m.role === 'tool') {
        const meta = m.metadata as {
          toolCallId?: string;
          name?: string;
          pendingAsk?: PendingAskMeta;
        } | null;
        if (meta?.pendingAsk && !meta.pendingAsk.answered) {
          // Skip unanswered pause placeholder until answer fills it.
          continue;
        }
        out.push({
          role: 'tool',
          content: m.content,
          toolCallId: meta?.toolCallId,
          name: meta?.name,
        });
      }
    }
    return out;
  }

  async *streamChat(input: {
    workspaceId: string;
    userId: string;
    conversationId?: string;
    message: string;
    provider?: AiProviderName;
  }): AsyncGenerator<AgentSseEvent> {
    const safeUserMessage = redactText(input.message);
    let conversationId = input.conversationId;

    if (conversationId) {
      const existing = await this.prisma.conversation.findFirst({
        where: { id: conversationId, workspaceId: input.workspaceId },
      });
      if (!existing) throw new NotFoundError('Conversation not found');
      const pending = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      if (
        this.findPendingAsk(
          pending.map((m) => ({
            metadata: m.metadata as Record<string, unknown> | null,
          })),
        )
      ) {
        yield {
          type: 'error',
          message: 'Answer the pending clarification question before sending a new message.',
        };
        return;
      }
    } else {
      const created = await this.createConversation({
        workspaceId: input.workspaceId,
        title: safeUserMessage.slice(0, 80) || 'New agent chat',
      });
      conversationId = created.id;
    }

    const currentUserRow = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: safeUserMessage,
      },
    });

    const messages = await this.rebuildMessages(
      conversationId,
      currentUserRow.id,
      input.message,
    );

    const { provider, model, providerName } = await this.resolveProvider(
      input.workspaceId,
      input.provider,
    );

    yield {
      type: 'status',
      message: `Agent thinking with ${providerName}/${model}…`,
    };

    const grounded = await this.loadGroundedIds(conversationId);
    const toolCtx = this.makeToolCtx(input.workspaceId, input.userId, grounded);
    const artifacts: Array<{ type: string; id: string; label?: string }> = [];

    yield* this.runToolLoop({
      conversationId,
      messages,
      provider,
      model,
      toolCtx,
      artifacts,
    });
  }

  async *streamAnswer(input: {
    workspaceId: string;
    userId: string;
    conversationId: string;
    askId: string;
    selectedOptionIds: string[];
    freeText?: string;
    provider?: AiProviderName;
  }): AsyncGenerator<AgentSseEvent> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: input.conversationId, workspaceId: input.workspaceId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundError('Conversation not found');

    const pendingMsg = [...conversation.messages].reverse().find((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      const pending = meta?.pendingAsk as PendingAskMeta | undefined;
      return pending?.askId === input.askId && !pending.answered;
    });
    if (!pendingMsg) {
      throw new ValidationError('No matching pending question for this conversation');
    }

    const meta = pendingMsg.metadata as Record<string, unknown>;
    const pending = meta.pendingAsk as PendingAskMeta;
    const selected = pending.options.filter((o) =>
      input.selectedOptionIds.includes(o.id),
    );
    if (!selected.length && !input.freeText?.trim()) {
      throw new ValidationError('Select at least one option');
    }
    if (!pending.allowMultiple && selected.length > 1) {
      throw new ValidationError('Only one option allowed');
    }

    const answerLabel = [
      ...selected.map((s) => s.label),
      ...(input.freeText?.trim() ? [input.freeText.trim()] : []),
    ].join('; ');

    await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        role: 'user',
        content: redactText(`Answer: ${answerLabel}`),
        metadata: {
          askId: input.askId,
          selectedOptionIds: input.selectedOptionIds,
          freeText: input.freeText ?? null,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    const toolPayload = JSON.stringify(
      redactSecrets({
        ok: true,
        data: {
          askId: input.askId,
          selectedOptionIds: input.selectedOptionIds,
          selectedLabels: selected.map((s) => s.label),
          freeText: input.freeText?.trim() || null,
          status: 'answered',
        },
      }),
    );

    await this.prisma.message.update({
      where: { id: pendingMsg.id },
      data: {
        content: toolPayload,
        metadata: {
          ...meta,
          pendingAsk: { ...pending, answered: true },
        } as unknown as Prisma.InputJsonValue,
      },
    });

    const messages = await this.rebuildMessages(input.conversationId);
    const { provider, model, providerName } = await this.resolveProvider(
      input.workspaceId,
      input.provider,
    );

    yield {
      type: 'status',
      message: `Continuing with ${providerName}/${model}…`,
    };

    const grounded = await this.loadGroundedIds(input.conversationId);
    const toolCtx = this.makeToolCtx(input.workspaceId, input.userId, grounded);
    const artifacts: Array<{ type: string; id: string; label?: string }> = [];

    yield* this.runToolLoop({
      conversationId: input.conversationId,
      messages,
      provider,
      model,
      toolCtx,
      artifacts,
    });
  }

  private async *runToolLoop(input: {
    conversationId: string;
    messages: AgentMessage[];
    provider: ReturnType<typeof aiProviderRegistry.create>;
    model: string;
    toolCtx: AgentToolContext;
    artifacts: Array<{ type: string; id: string; label?: string }>;
  }): AsyncGenerator<AgentSseEvent> {
    const { conversationId, messages, provider, model, toolCtx, artifacts } = input;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      let response;
      try {
        response = await provider.chatWithTools({
          model,
          messages,
          tools: AGENT_TOOL_DEFINITIONS,
          temperature: 0,
          maxTokens: 4096,
          timeoutMs: 90_000,
          toolChoice: 'auto',
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'AI provider request failed';
        yield { type: 'error', message };
        return;
      }

      const assistant = response.message;
      const toolCalls = assistant.toolCalls ?? [];

      if (!toolCalls.length) {
        const content = assistant.content?.trim() || 'Done.';
        await this.prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content,
          },
        });
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
        yield { type: 'message', role: 'assistant', content };
        yield { type: 'done', conversationId, artifacts };
        return;
      }

      // If the model asks the user, only run ask_user this turn (no parallel side effects).
      const askOnly = toolCalls.filter((c) => c.name === 'ask_user');
      const effectiveCalls = askOnly.length ? askOnly.slice(0, 1) : toolCalls;

      await this.prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: assistant.content || '',
          metadata: {
            toolCalls: redactSecrets(effectiveCalls),
          } as unknown as Prisma.InputJsonValue,
        },
      });
      messages.push({
        role: 'assistant',
        content: assistant.content || '',
        toolCalls: effectiveCalls,
      });

      for (const call of effectiveCalls) {
        const safeArgs = redactSecrets(call.arguments ?? {});
        yield {
          type: 'tool_start',
          id: call.id,
          name: call.name,
          arguments: safeArgs,
        };

        const started = Date.now();
        const result = await runAgentTool(call.name, call.arguments ?? {}, toolCtx);
        const latencyMs = Date.now() - started;
        const safeResult = redactSecrets(result.data ?? null);

        for (const artifact of result.artifacts ?? []) {
          artifacts.push(artifact);
          yield { type: 'artifact', artifact };
        }

        yield {
          type: 'tool_end',
          id: call.id,
          name: call.name,
          ok: result.ok,
          latencyMs,
          result: safeResult,
          error: result.error,
          artifacts: result.artifacts,
        };

        if (result.pauseAsk) {
          const pause = { ...result.pauseAsk, toolCallId: call.id };
          const toolPayload = JSON.stringify(
            redactSecrets({
              ok: true,
              data: result.data,
              artifacts: result.artifacts,
            }),
          );

          await this.prisma.message.create({
            data: {
              conversationId,
              role: 'tool',
              content: toolPayload,
              metadata: {
                toolCallId: call.id,
                name: call.name,
                latencyMs,
                arguments: safeArgs,
                pendingAsk: pause,
              } as unknown as Prisma.InputJsonValue,
            },
          });

          yield {
            type: 'ask',
            askId: pause.askId,
            question: pause.question,
            options: pause.options,
            allowMultiple: pause.allowMultiple,
          };
          yield {
            type: 'awaiting_input',
            conversationId,
            askId: pause.askId,
          };
          return;
        }

        const toolPayload = JSON.stringify(
          redactSecrets({
            ok: result.ok,
            data: result.data,
            error: result.error,
            artifacts: result.artifacts,
          }),
        );

        await this.prisma.message.create({
          data: {
            conversationId,
            role: 'tool',
            content: toolPayload,
            metadata: {
              toolCallId: call.id,
              name: call.name,
              latencyMs,
              arguments: safeArgs,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        messages.push({
          role: 'tool',
          content: toolPayload,
          toolCallId: call.id,
          name: call.name,
        });
      }
    }

    const fallback =
      'Reached the maximum number of tool steps. Summarize progress and ask how to continue.';
    await this.prisma.message.create({
      data: { conversationId, role: 'assistant', content: fallback },
    });
    yield { type: 'message', role: 'assistant', content: fallback };
    yield { type: 'done', conversationId, artifacts };
  }

  /** Non-streaming helper for tests. */
  async runChatOnce(input: {
    workspaceId: string;
    userId: string;
    message: string;
    provider?: AiProviderName;
  }) {
    if (!input.message.trim()) throw new ValidationError('message required');
    const events: AgentSseEvent[] = [];
    for await (const event of this.streamChat(input)) {
      events.push(event);
    }
    return events;
  }
}
