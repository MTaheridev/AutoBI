import type { z } from 'zod';

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface TextAIRequest {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface TextAIResponse {
  text: string;
  usage?: TokenUsage;
  provider: string;
  model: string;
}

export interface StructuredAIRequest<T> {
  model: string;
  prompt: string;
  system?: string;
  schema: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface StructuredAIResponse<T> {
  data: T;
  usage?: TokenUsage;
  provider: string;
  model: string;
}

export interface AIProvider {
  readonly name: string;

  generateStructured<T>(request: StructuredAIRequest<T>): Promise<StructuredAIResponse<T>>;

  generateText(request: TextAIRequest): Promise<TextAIResponse>;

  testConnection(model: string): Promise<{ ok: boolean; message: string }>;
}

export interface AIProviderFactory {
  readonly name: string;
  create(apiKey: string): AIProvider;
}
