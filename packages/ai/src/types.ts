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

export type AgentMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  /** Gemini 3 thought signature required when replaying functionCall parts. */
  thoughtSignature?: string;
}

export interface AgentMessage {
  role: AgentMessageRole;
  content: string;
  /** Present on assistant messages that requested tools. */
  toolCalls?: AgentToolCall[];
  /** Present on tool result messages. */
  toolCallId?: string;
  name?: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  /** JSON Schema object for the tool parameters. */
  parameters: Record<string, unknown>;
}

export interface AgentChatRequest {
  model: string;
  messages: AgentMessage[];
  tools: AgentToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** When true, force the model to call a tool if supported. */
  toolChoice?: 'auto' | 'required' | 'none';
}

export interface AgentChatResponse {
  message: AgentMessage;
  usage?: TokenUsage;
  provider: string;
  model: string;
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface AIProvider {
  readonly name: string;

  generateStructured<T>(request: StructuredAIRequest<T>): Promise<StructuredAIResponse<T>>;

  generateText(request: TextAIRequest): Promise<TextAIResponse>;

  chatWithTools(request: AgentChatRequest): Promise<AgentChatResponse>;

  testConnection(model: string): Promise<{ ok: boolean; message: string }>;
}

export interface AIProviderFactory {
  readonly name: string;
  create(apiKey: string): AIProvider;
}
