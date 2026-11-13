import { describe, expect, it, vi, beforeEach } from 'vitest';
import { aiProviderRegistry, type AIProvider } from '@autobi/ai';
import { AgentService } from './agent.service.js';

describe('AgentService.runChatOnce', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes tool calls and emits assistant message + done', async () => {
    let callCount = 0;
    const fakeProvider: AIProvider = {
      name: 'gemini',
      async generateText() {
        return { text: 'ok', provider: 'gemini', model: 'gemini-2.5-flash' };
      },
      async generateStructured() {
        throw new Error('unused');
      },
      async testConnection() {
        return { ok: true, message: 'ok' };
      },
      async chatWithTools() {
        callCount += 1;
        if (callCount === 1) {
          return {
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            finishReason: 'tool_calls',
            message: {
              role: 'assistant',
              content: '',
              toolCalls: [
                {
                  id: 'call_1',
                  name: 'get_workspace_overview',
                  arguments: {},
                },
              ],
            },
          };
        }
        return {
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          finishReason: 'stop',
          message: {
            role: 'assistant',
            content: 'Workspace has 0 data sources.',
          },
        };
      },
    };

    vi.spyOn(aiProviderRegistry, 'create').mockReturnValue(fakeProvider);

    const messages: Array<{ id: string; role: string; content: string; metadata?: unknown; createdAt: Date }> = [];
    const prisma = {
      conversation: {
        create: vi.fn().mockResolvedValue({
          id: '11111111-1111-1111-1111-111111111111',
          title: 'test',
          dataSourceId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findFirst: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      message: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const row = { id: `m_${messages.length}`, createdAt: new Date(), ...data };
          messages.push(row);
          return row;
        }),
        findMany: vi.fn().mockImplementation(async () => messages),
      },
      aIProviderConfig: {
        findMany: vi.fn().mockResolvedValue([
          { provider: 'gemini', model: 'gemini-2.5-flash', encryptedKey: 'enc' },
        ]),
      },
      membership: {
        findUnique: vi.fn().mockResolvedValue({ role: 'Owner' }),
      },
    };

    const service = new AgentService(
      prisma as never,
      { decrypt: () => 'AQ.FakeKey' } as never,
      { list: vi.fn().mockResolvedValue([]) } as never,
      { list: vi.fn().mockResolvedValue([]) } as never,
      { list: vi.fn().mockResolvedValue([]) } as never,
      { list: vi.fn().mockResolvedValue([]) } as never,
    );

    const events = await service.runChatOnce({
      workspaceId: '22222222-2222-2222-2222-222222222222',
      userId: '33333333-3333-3333-3333-333333333333',
      message: 'Check workspace',
    });

    expect(events.some((e) => e.type === 'tool_start' && e.name === 'get_workspace_overview')).toBe(
      true,
    );
    expect(events.some((e) => e.type === 'tool_end' && e.ok)).toBe(true);
    expect(events.some((e) => e.type === 'message' && e.content.includes('0 data sources'))).toBe(
      true,
    );
    expect(events[events.length - 1]?.type).toBe('done');
  });
});
