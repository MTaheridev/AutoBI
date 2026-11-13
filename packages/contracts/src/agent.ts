import { z } from 'zod';

export const createAgentConversationSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(120).optional(),
  dataSourceId: z.string().uuid().optional(),
});

export const agentChatStreamSchema = z.object({
  workspaceId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(8000),
  provider: z.enum(['openai', 'openrouter', 'gemini']).optional(),
});

export const agentAnswerStreamSchema = z
  .object({
    workspaceId: z.string().uuid(),
    conversationId: z.string().uuid(),
    askId: z.string().uuid(),
    selectedOptionIds: z.array(z.string().min(1).max(64)).max(6).default([]),
    freeText: z.string().max(2000).optional(),
    provider: z.enum(['openai', 'openrouter', 'gemini']).optional(),
  })
  .refine(
    (v) => v.selectedOptionIds.length > 0 || Boolean(v.freeText?.trim()),
    { message: 'Select an option or provide free text' },
  );

export type CreateAgentConversationInput = z.infer<typeof createAgentConversationSchema>;
export type AgentChatStreamInput = z.infer<typeof agentChatStreamSchema>;
export type AgentAnswerStreamInput = z.infer<typeof agentAnswerStreamSchema>;
