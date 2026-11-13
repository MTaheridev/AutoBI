import {
  AIProviderError,
  type AgentChatRequest,
  type AgentChatResponse,
  type AIProvider,
  type AIProviderFactory,
  type StructuredAIRequest,
  type StructuredAIResponse,
  type TextAIRequest,
  type TextAIResponse,
} from '@autobi/ai';
import { chatCompletion, openAiChatWithTools } from './http.js';

class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter';

  constructor(private readonly apiKey: string) {}

  async generateText(request: TextAIRequest): Promise<TextAIResponse> {
    const messages = [
      ...(request.system ? [{ role: 'system', content: request.system }] : []),
      { role: 'user', content: request.prompt },
    ];
    const result = await chatCompletion({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: this.apiKey,
      model: request.model,
      messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      timeoutMs: request.timeoutMs,
    });
    return {
      text: result.text,
      usage: result.usage,
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

    const result = await chatCompletion({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: this.apiKey,
      model: request.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: request.prompt },
      ],
      temperature: request.temperature ?? 0,
      maxTokens: request.maxTokens,
      timeoutMs: request.timeoutMs,
      responseFormat: { type: 'json_object' },
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      throw new AIProviderError('Provider returned invalid JSON');
    }

    const validated = request.schema.safeParse(parsed);
    if (!validated.success) {
      throw new AIProviderError('Structured output failed validation', validated.error.flatten());
    }

    return {
      data: validated.data,
      usage: result.usage,
      provider: this.name,
      model: request.model,
    };
  }

  async chatWithTools(request: AgentChatRequest): Promise<AgentChatResponse> {
    return openAiChatWithTools(
      {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: this.apiKey,
        provider: this.name,
      },
      request,
    );
  }

  async testConnection(model: string): Promise<{ ok: boolean; message: string }> {
    try {
      await this.generateText({
        model,
        prompt: 'Reply with the single word: ok',
        maxTokens: 5,
        timeoutMs: 15_000,
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

export const openrouterFactory: AIProviderFactory = {
  name: 'openrouter',
  create(apiKey: string) {
    return new OpenRouterProvider(apiKey);
  },
};
