import {
  AIProviderError,
  AIRateLimitError,
  type AgentChatRequest,
  type AgentChatResponse,
  type AgentMessage,
  type AgentToolCall,
  type AIProvider,
  type AIProviderFactory,
  type StructuredAIRequest,
  type StructuredAIResponse,
  type TextAIRequest,
  type TextAIResponse,
  type TokenUsage,
} from '@autobi/ai';
import { smartFetch } from './proxy-fetch.js';

type GeminiSurface = 'studio' | 'vertex';

const SURFACE_URL: Record<GeminiSurface, string> = {
  studio: 'https://generativelanguage.googleapis.com/v1beta/models',
  vertex: 'https://aiplatform.googleapis.com/v1/publishers/google/models',
};

const FALLBACK_FLASH_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
];

/** Cache which Gemini surface works for a given API key fingerprint. */
const surfaceCache = new Map<string, GeminiSurface>();

function keyFingerprint(apiKey: string): string {
  return `${apiKey.slice(0, 8)}:${apiKey.length}`;
}

function preferredSurfaces(apiKey: string): GeminiSurface[] {
  const cached = surfaceCache.get(keyFingerprint(apiKey));
  if (cached) return cached === 'studio' ? ['studio', 'vertex'] : ['vertex', 'studio'];
  return ['studio', 'vertex'];
}

function modelPath(model: string): string {
  return model.replace(/^models\//, '').replace(/^google\//, '');
}

type GeminiPart =
  | { text: string; thoughtSignature?: string }
  | {
      functionCall: { id?: string; name: string; args?: Record<string, unknown> };
      thoughtSignature?: string;
    }
  | {
      functionResponse: {
        id?: string;
        name: string;
        response: Record<string, unknown>;
      };
    };

type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

function toGeminiContents(messages: AgentMessage[]): {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
} {
  let systemInstruction: { parts: Array<{ text: string }> } | undefined;
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      const prev = systemInstruction?.parts[0]?.text ?? '';
      systemInstruction = {
        parts: [{ text: prev ? `${prev}\n${msg.content}` : msg.content }],
      };
      continue;
    }

    if (msg.role === 'user') {
      const prev = contents[contents.length - 1];
      if (prev && prev.role === 'user' && prev.parts.every((p) => 'text' in p)) {
        prev.parts.push({ text: msg.content });
      } else {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      }
      continue;
    }

    if (msg.role === 'assistant') {
      const parts: GeminiPart[] = [];
      if (msg.content) parts.push({ text: msg.content });
      for (const call of msg.toolCalls ?? []) {
        parts.push({
          functionCall: {
            ...(call.id ? { id: call.id } : {}),
            name: call.name,
            args: call.arguments ?? {},
          },
          ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
        });
      }
      if (!parts.length) parts.push({ text: '' });
      contents.push({ role: 'model', parts });
      continue;
    }

    if (msg.role === 'tool') {
      let response: Record<string, unknown>;
      try {
        response = JSON.parse(msg.content) as Record<string, unknown>;
      } catch {
        response = { result: msg.content };
      }
      const responsePart: GeminiPart = {
        functionResponse: {
          ...(msg.toolCallId ? { id: msg.toolCallId } : {}),
          name: msg.name ?? 'tool',
          response,
        },
      };
      const prev = contents[contents.length - 1];
      if (
        prev &&
        prev.role === 'user' &&
        prev.parts.every((p) => 'functionResponse' in p)
      ) {
        prev.parts.push(responsePart);
      } else {
        contents.push({ role: 'user', parts: [responsePart] });
      }
    }
  }

  return { systemInstruction, contents };
}

type GeminiRawResponse = {
  candidates?: Array<{
    content?: { parts?: Array<Record<string, unknown>> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

async function geminiRequest(options: {
  apiKey: string;
  model: string;
  surface: GeminiSurface;
  body: Record<string, unknown>;
  timeoutMs: number;
}): Promise<GeminiRawResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const url = `${SURFACE_URL[options.surface]}/${encodeURIComponent(modelPath(options.model))}:generateContent`;

  try {
    const response = await smartFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': options.apiKey,
      },
      body: JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (response.status === 429) throw new AIRateLimitError();

    if (!response.ok) {
      const body = await response.text();
      throw new AIProviderError(`Gemini request failed (${response.status})`, {
        status: response.status,
        body: body.slice(0, 500),
        surface: options.surface,
      });
    }

    return (await response.json()) as GeminiRawResponse;
  } finally {
    clearTimeout(timeout);
  }
}

function errorStatus(error: unknown): number | undefined {
  if (!(error instanceof AIProviderError)) return undefined;
  return (error.details as { status?: number } | undefined)?.status;
}

async function geminiRequestWithFallback(options: {
  apiKey: string;
  model: string;
  body: Record<string, unknown>;
  timeoutMs: number;
}): Promise<GeminiRawResponse> {
  const cleanModel = modelPath(options.model);
  const candidateModels = [
    cleanModel,
    ...FALLBACK_FLASH_MODELS.filter((m) => m !== cleanModel),
  ];

  const surfaces = preferredSurfaces(options.apiKey);
  let lastError: unknown;

  for (const surface of surfaces) {
    let surfaceRejectedAuth = false;
    for (const model of candidateModels) {
      try {
        const json = await geminiRequest({ ...options, model, surface });
        surfaceCache.set(keyFingerprint(options.apiKey), surface);
        return json;
      } catch (error) {
        lastError = error;
        const status = errorStatus(error);
        if (status === 401 || status === 403) {
          surfaceRejectedAuth = true;
          break;
        }
        // Retry next fallback model on rate-limit (429), deprecated (404), or transient overload (503)
        if (error instanceof AIRateLimitError || status === 404 || status === 503) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        throw error;
      }
    }
    if (!surfaceRejectedAuth) break;
  }

  throw lastError instanceof Error
    ? lastError
    : new AIProviderError('Gemini request failed on Studio and Vertex surfaces');
}

function usageFromGemini(meta?: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}): TokenUsage | undefined {
  if (!meta) return undefined;
  return {
    promptTokens: meta.promptTokenCount,
    completionTokens: meta.candidatesTokenCount,
    totalTokens: meta.totalTokenCount,
  };
}

function parseGeminiParts(parts: Array<Record<string, unknown>> | undefined): {
  text: string;
  toolCalls: AgentToolCall[];
} {
  const textParts: string[] = [];
  const toolCalls: AgentToolCall[] = [];
  for (const part of parts ?? []) {
    if (part.thought === true) continue;
    if (typeof part.text === 'string') textParts.push(part.text);
    const fc = part.functionCall as
      | { id?: string; name?: string; args?: Record<string, unknown> }
      | undefined;
    if (fc?.name) {
      toolCalls.push({
        id: fc.id || `gemini_${fc.name}_${toolCalls.length}`,
        name: fc.name,
        arguments: (fc.args ?? {}) as Record<string, unknown>,
        ...(typeof part.thoughtSignature === 'string'
          ? { thoughtSignature: part.thoughtSignature }
          : {}),
      });
    }
  }
  return { text: textParts.join('\n'), toolCalls };
}

class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  constructor(private readonly apiKey: string) {}

  async generateText(request: TextAIRequest): Promise<TextAIResponse> {
    const { systemInstruction, contents } = toGeminiContents([
      ...(request.system ? [{ role: 'system' as const, content: request.system }] : []),
      { role: 'user', content: request.prompt },
    ]);

    const json = await geminiRequestWithFallback({
      apiKey: this.apiKey,
      model: request.model,
      timeoutMs: request.timeoutMs ?? 30_000,
      body: {
        ...(systemInstruction ? { systemInstruction } : {}),
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          maxOutputTokens: request.maxTokens ?? 1024,
        },
      },
    });

    const { text } = parseGeminiParts(json.candidates?.[0]?.content?.parts);
    return {
      text,
      usage: usageFromGemini(json.usageMetadata),
      provider: this.name,
      model: request.model,
    };
  }

  async generateStructured<T>(request: StructuredAIRequest<T>): Promise<StructuredAIResponse<T>> {
    const system = [
      request.system,
      'Respond with valid JSON only that matches the requested schema.',
    ]
      .filter(Boolean)
      .join('\n');

    const { systemInstruction, contents } = toGeminiContents([
      { role: 'system', content: system },
      { role: 'user', content: request.prompt },
    ]);

    const json = await geminiRequestWithFallback({
      apiKey: this.apiKey,
      model: request.model,
      timeoutMs: request.timeoutMs ?? 45_000,
      body: {
        ...(systemInstruction ? { systemInstruction } : {}),
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0,
          maxOutputTokens: request.maxTokens ?? 4096,
          responseMimeType: 'application/json',
        },
      },
    });

    const { text } = parseGeminiParts(json.candidates?.[0]?.content?.parts);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new AIProviderError('Provider returned invalid JSON');
    }

    const validated = request.schema.safeParse(parsed);
    if (!validated.success) {
      throw new AIProviderError('Structured output failed validation', validated.error.flatten());
    }

    return {
      data: validated.data,
      usage: usageFromGemini(json.usageMetadata),
      provider: this.name,
      model: request.model,
    };
  }

  async chatWithTools(request: AgentChatRequest): Promise<AgentChatResponse> {
    const { systemInstruction, contents } = toGeminiContents(request.messages);
    const tools =
      request.tools.length > 0
        ? [
            {
              functionDeclarations: request.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: sanitizeGeminiSchema(t.parameters),
              })),
            },
          ]
        : undefined;

    const json = await geminiRequestWithFallback({
      apiKey: this.apiKey,
      model: request.model,
      timeoutMs: request.timeoutMs ?? 90_000,
      body: {
        ...(systemInstruction ? { systemInstruction } : {}),
        contents,
        ...(tools ? { tools } : {}),
        toolConfig:
          request.toolChoice === 'required'
            ? { functionCallingConfig: { mode: 'ANY' } }
            : request.toolChoice === 'none'
              ? { functionCallingConfig: { mode: 'NONE' } }
              : { functionCallingConfig: { mode: 'AUTO' } },
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          maxOutputTokens: request.maxTokens ?? 4096,
        },
      },
    });

    const { text, toolCalls } = parseGeminiParts(json.candidates?.[0]?.content?.parts);
    return {
      message: {
        role: 'assistant',
        content: text,
        toolCalls: toolCalls.length ? toolCalls : undefined,
      },
      usage: usageFromGemini(json.usageMetadata),
      provider: this.name,
      model: request.model,
      finishReason: toolCalls.length ? 'tool_calls' : 'stop',
    };
  }

  async testConnection(model: string): Promise<{ ok: boolean; message: string }> {
    try {
      await this.generateText({
        model,
        prompt: 'Reply with the single word: ok',
        maxTokens: 16,
        timeoutMs: 25_000,
      });
      return { ok: true, message: 'Connection successful' };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

/**
 * Gemini's OpenAPI subset rejects `additionalProperties` inside functionDeclarations
 * on several endpoints — strip unsupported JSON Schema keys recursively.
 */
function sanitizeGeminiSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return { type: 'object' };
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(schema as Record<string, unknown>)) {
    if (key === 'additionalProperties') continue;
    if (key === 'properties' && val && typeof val === 'object' && !Array.isArray(val)) {
      const props: Record<string, unknown> = {};
      for (const [pk, pv] of Object.entries(val as Record<string, unknown>)) {
        props[pk] = sanitizeGeminiSchema(pv);
      }
      out.properties = props;
    } else if (key === 'items' && val && typeof val === 'object') {
      out.items = sanitizeGeminiSchema(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

export const geminiFactory: AIProviderFactory = {
  name: 'gemini',
  create(apiKey: string) {
    return new GeminiProvider(apiKey);
  },
};

/** Test helper — clear surface cache between cases. */
export function __resetGeminiSurfaceCache() {
  surfaceCache.clear();
}
