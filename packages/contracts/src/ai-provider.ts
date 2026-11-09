import { z } from 'zod';

export const aiProviderNames = ['openai', 'openrouter'] as const;

export const saveAiProviderConfigSchema = z.object({
  workspaceId: z.string().uuid(),
  provider: z.enum(aiProviderNames),
  apiKey: z.string().min(1),
  model: z.string().min(1),
});

export const testAiProviderSchema = z.object({
  workspaceId: z.string().uuid(),
  provider: z.enum(aiProviderNames),
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1),
  configId: z.string().uuid().optional(),
});

export const aiProviderConfigSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  provider: z.enum(aiProviderNames),
  model: z.string(),
  hasKey: z.literal(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SaveAiProviderConfigInput = z.infer<typeof saveAiProviderConfigSchema>;
export type TestAiProviderInput = z.infer<typeof testAiProviderSchema>;
export type AiProviderConfigDto = z.infer<typeof aiProviderConfigSchema>;
