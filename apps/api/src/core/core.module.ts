import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { RedisService } from './redis.service.js';
import { SessionService } from './session.service.js';
import { EncryptionService } from './encryption.service.js';
import { QueueService } from './queue.service.js';
import { LoggerService } from './logger.service.js';
import { AuditService } from './audit.service.js';
import { QueryConcurrencyService } from './query-concurrency.service.js';
import { ConnectorPoolService } from './connector-pool.service.js';
import { WorkspaceThrottleService } from './workspace-throttle.service.js';
import { MailService } from './mail.service.js';

@Global()
@Module({
  providers: [
    PrismaService,
    RedisService,
    SessionService,
    EncryptionService,
    QueueService,
    LoggerService,
    AuditService,
    QueryConcurrencyService,
    ConnectorPoolService,
    WorkspaceThrottleService,
    MailService,
  ],
  exports: [
    PrismaService,
    RedisService,
    SessionService,
    EncryptionService,
    QueueService,
    LoggerService,
    AuditService,
    QueryConcurrencyService,
    ConnectorPoolService,
    WorkspaceThrottleService,
    MailService,
  ],
})
export class CoreModule {}
