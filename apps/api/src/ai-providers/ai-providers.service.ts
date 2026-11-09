import { Injectable, OnModuleInit } from '@nestjs/common';
import { aiProviderRegistry } from '@autobi/ai';
import { registerBuiltinAiProviders } from '@autobi/ai-providers';
import { NotFoundError } from '@autobi/shared';
import type { AiProviderName } from '@autobi/database';
import { PrismaService } from '../core/prisma.service.js';
import { EncryptionService } from '../core/encryption.service.js';

@Injectable()
export class AiProvidersService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  onModuleInit() {
    registerBuiltinAiProviders();
  }

  listAvailable() {
    return aiProviderRegistry.list().map((name) => ({
      name,
      models:
        name === 'openai'
          ? ['gpt-4o-mini', 'gpt-4o']
          : ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'],
    }));
  }

  async listConfigs(workspaceId: string) {
    const configs = await this.prisma.aIProviderConfig.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    return configs.map((c) => ({
      id: c.id,
      workspaceId: c.workspaceId,
      provider: c.provider,
      model: c.model,
      hasKey: true as const,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async saveConfig(input: {
    workspaceId: string;
    provider: AiProviderName;
    apiKey: string;
    model: string;
  }) {
    const encryptedKey = this.encryption.encrypt(input.apiKey);
    const config = await this.prisma.aIProviderConfig.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: input.workspaceId,
          provider: input.provider,
        },
      },
      create: {
        workspaceId: input.workspaceId,
        provider: input.provider,
        encryptedKey,
        model: input.model,
      },
      update: {
        encryptedKey,
        model: input.model,
      },
    });

    return {
      id: config.id,
      workspaceId: config.workspaceId,
      provider: config.provider,
      model: config.model,
      hasKey: true as const,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  async deleteConfig(workspaceId: string, id: string) {
    const existing = await this.prisma.aIProviderConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundError('AI provider config not found');
    await this.prisma.aIProviderConfig.delete({ where: { id } });
    return { ok: true };
  }

  async test(input: {
    workspaceId: string;
    provider: AiProviderName;
    model: string;
    apiKey?: string;
    configId?: string;
  }) {
    let apiKey = input.apiKey;
    if (!apiKey && input.configId) {
      const config = await this.prisma.aIProviderConfig.findFirst({
        where: { id: input.configId, workspaceId: input.workspaceId },
      });
      if (!config) throw new NotFoundError('AI provider config not found');
      apiKey = this.encryption.decrypt(config.encryptedKey);
    }
    if (!apiKey) {
      const config = await this.prisma.aIProviderConfig.findUnique({
        where: {
          workspaceId_provider: {
            workspaceId: input.workspaceId,
            provider: input.provider,
          },
        },
      });
      if (config) apiKey = this.encryption.decrypt(config.encryptedKey);
    }
    if (!apiKey) throw new NotFoundError('API key required for test');

    const provider = aiProviderRegistry.create(input.provider, apiKey);
    return provider.testConnection(input.model);
  }
}
