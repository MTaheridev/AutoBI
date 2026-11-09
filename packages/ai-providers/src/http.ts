import { AIProviderError, AIRateLimitError, type TokenUsage } from '@autobi/ai';

export interface ChatCompletionResult {
  text: string;
  usage?: TokenUsage;
}

export async function chatCompletion(options: {
  url: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: { type: string };
}): Promise<ChatCompletionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const response = await fetch(options.url, {
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
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const text = json.choices?.[0]?.message?.content ?? '';
    return {
      text,
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
