import {
  AIProviderError,
  AIRateLimitError,
  type AgentChatRequest,
  type AgentChatResponse,
  type AgentMessage,
  type AgentToolCall,
  type TokenUsage,
} from '@autobi/ai';
import { smartFetch } from './proxy-fetch.js';

export interface ChatCompletionResult {
  text: string;
  usage?: TokenUsage;
  toolCalls?: AgentToolCall[];
  finishReason?: AgentChatResponse['finishReason'];
}

export async function chatCompletion(options: {
  url: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string; name?: string }>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: { type: string };
  tools?: Array<{
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }>;
  toolChoice?: 'auto' | 'required' | 'none';
}): Promise<ChatCompletionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const response = await smartFetch(options.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1024,
        ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
        ...(options.tools?.length ? { tools: options.tools } : {}),
        ...(options.toolChoice && options.tools?.length
          ? { tool_choice: options.toolChoice }
          : {}),
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new AIRateLimitError();
    }

    if (!response.ok) {
      const body = await response.text();
      throw new AIProviderError(`Provider request failed (${response.status})`, {
        status: response.status,
        body: body.slice(0, 500),
      });
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const choice = json.choices?.[0];
    const rawCalls = choice?.message?.tool_calls ?? [];
    const toolCalls: AgentToolCall[] = rawCalls
      .map((call) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function?.arguments ?? '{}') as Record<string, unknown>;
        } catch {
          args = {};
        }
        return {
          id: call.id,
          name: call.function?.name ?? '',
          arguments: args,
        };
      })
      .filter((c) => c.name);

    const finish =
      toolCalls.length || choice?.finish_reason === 'tool_calls'
        ? 'tool_calls'
        : choice?.finish_reason === 'length'
          ? 'length'
          : 'stop';

    return {
      text: choice?.message?.content ?? '',
      toolCalls: toolCalls.length ? toolCalls : undefined,
      finishReason: finish,
      usage: json.usage
        ? {
            promptTokens: json.usage.prompt_tokens,
            completionTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof AIProviderError || error instanceof AIRateLimitError) throw error;
    throw new AIProviderError(error instanceof Error ? error.message : 'Unknown AI error');
  } finally {
    clearTimeout(timeout);
  }
}

export function toOpenAiMessages(
  messages: AgentMessage[],
): Array<{
  role: string;
  content: string | null;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
}> {
  return messages.map((m) => {
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: {
            name: c.name,
            arguments: JSON.stringify(c.arguments ?? {}),
          },
        })),
      };
    }
    if (m.role === 'tool') {
      return {
        role: 'tool',
        content: m.content,
        tool_call_id: m.toolCallId,
        name: m.name,
      };
    }
    return { role: m.role, content: m.content };
  });
}

export async function openAiChatWithTools(
  options: {
    url: string;
    apiKey: string;
    provider: string;
  },
  request: AgentChatRequest,
): Promise<AgentChatResponse> {
  const result = await chatCompletion({
    url: options.url,
    apiKey: options.apiKey,
    model: request.model,
    messages: toOpenAiMessages(request.messages),
    temperature: request.temperature,
    maxTokens: request.maxTokens ?? 4096,
    timeoutMs: request.timeoutMs ?? 90_000,
    tools: request.tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    })),
    toolChoice: request.toolChoice,
  });

  return {
    message: {
      role: 'assistant',
      content: result.text,
      toolCalls: result.toolCalls,
    },
    usage: result.usage,
    provider: options.provider,
    model: request.model,
    finishReason: result.finishReason,
  };
}
