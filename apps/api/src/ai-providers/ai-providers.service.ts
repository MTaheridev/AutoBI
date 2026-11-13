import { Injectable, OnModuleInit } from '@nestjs/common';
import { aiProviderRegistry } from '@autobi/ai';
import { registerBuiltinAiProviders } from '@autobi/ai-providers';
import { NotFoundError, ValidationError } from '@autobi/shared';
import type { AiProviderName } from '@autobi/database';
import { PrismaService } from '../core/prisma.service.js';
import { EncryptionService } from '../core/encryption.service.js';
import { AuditService } from '../core/audit.service.js';

@Injectable()
export class AiProvidersService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    registerBuiltinAiProviders();
  }

  listAvailable() {
    return aiProviderRegistry.list().map((name) => ({
      name,
      models:
        name === 'openai'
          ? ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini']
          : name === 'gemini'
            ? [
                'gemini-3.5-flash',
                'gemini-3.8-flash',
                'gemini-3.5-flash-lite',
                'gemini-3.1-pro-preview',
                'gemini-flash-latest',
              ]
            : [
                'openai/gpt-4o-mini',
                'openai/gpt-4o',
                'anthropic/claude-3.5-sonnet',
                'anthropic/claude-sonnet-4',
                'google/gemini-2.0-flash-001',
              ],
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
    apiKey?: string;
    model: string;
    configId?: string;
    actorId?: string;
  }) {
    if (input.configId) {
      const existing = await this.prisma.aIProviderConfig.findFirst({
        where: { id: input.configId, workspaceId: input.workspaceId },
      });
      if (!existing) throw new NotFoundError('AI provider config not found');

      const encryptedKey = input.apiKey
        ? this.encryption.encrypt(input.apiKey)
        : existing.encryptedKey;

      const config = await this.prisma.aIProviderConfig.update({
        where: { id: existing.id },
        data: {
          provider: input.provider,
          model: input.model,
          encryptedKey,
        },
      });

      await this.audit.record({
        action: 'ai_config.update',
        actorId: input.actorId,
        workspaceId: input.workspaceId,
        metadata: {
          provider: config.provider,
          model: config.model,
          configId: config.id,
          keyRotated: Boolean(input.apiKey),
        },
      });

      return this.toDto(config);
    }

    if (!input.apiKey) {
      throw new ValidationError('apiKey is required when creating a provider config');
    }

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

    await this.audit.record({
      action: 'ai_config.save',
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      metadata: { provider: config.provider, model: config.model, configId: config.id },
    });

    return this.toDto(config);
  }

  async deleteConfig(workspaceId: string, id: string, actorId?: string) {
    const existing = await this.prisma.aIProviderConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundError('AI provider config not found');
    await this.prisma.aIProviderConfig.delete({ where: { id } });
    await this.audit.record({
      action: 'ai_config.delete',
      actorId,
      workspaceId,
      metadata: { configId: id, provider: existing.provider },
    });
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

  private toDto(config: {
    id: string;
    workspaceId: string;
    provider: AiProviderName;
    model: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
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
}
