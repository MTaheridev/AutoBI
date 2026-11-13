import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { geminiFactory, __resetGeminiSurfaceCache } from './gemini.js';

describe('GeminiProvider', () => {
  beforeEach(() => {
    __resetGeminiSurfaceCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generateText uses x-goog-api-key and parses text parts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = geminiFactory.create('AIzaSyTestKey');
    const result = await provider.generateText({
      model: 'gemini-2.0-flash',
      prompt: 'Reply ok',
      maxTokens: 8,
    });

    expect(result.text).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIzaSyTestKey');
  });

  it('chatWithTools returns functionCall tool calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: 'Checking schema' },
                { functionCall: { name: 'inspect_schema', args: { search: 'purchase' } } },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = geminiFactory.create('AQ.TestKey');
    const result = await provider.chatWithTools({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Show purchases' }],
      tools: [
        {
          name: 'inspect_schema',
          description: 'Inspect tables',
          parameters: { type: 'object', properties: { search: { type: 'string' } } },
        },
      ],
    });

    expect(result.finishReason).toBe('tool_calls');
    expect(result.message.toolCalls?.[0]?.name).toBe('inspect_schema');
    expect(result.message.toolCalls?.[0]?.arguments).toEqual({ search: 'purchase' });
  });

  it('falls back from Studio 403 to Vertex Express', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'PERMISSION_DENIED',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const provider = geminiFactory.create('AQ.Ab8RN6KFfallback');
    const result = await provider.generateText({
      model: 'gemini-2.0-flash',
      prompt: 'ok',
    });

    expect(result.text).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = (fetchMock.mock.calls[1] as [string])[0];
    expect(secondUrl).toContain('aiplatform.googleapis.com');
  });
});
