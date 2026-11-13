import { Injectable } from '@nestjs/common';
import type { Prisma } from '@autobi/database';
import { PrismaService } from './prisma.service.js';
import { LoggerService } from './logger.service.js';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async record(input: {
    action: string;
    actorId?: string | null;
    workspaceId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          actorId: input.actorId ?? null,
          workspaceId: input.workspaceId ?? null,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      this.logger.logger.warn({ err: error, action: input.action }, 'audit_write_failed');
    }
  }
}
