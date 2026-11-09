import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { RedisService } from './redis.service.js';
import { SessionService } from './session.service.js';
import { EncryptionService } from './encryption.service.js';
import { QueueService } from './queue.service.js';

@Global()
@Module({
  providers: [PrismaService, RedisService, SessionService, EncryptionService, QueueService],
  exports: [PrismaService, RedisService, SessionService, EncryptionService, QueueService],
})
export class CoreModule {}
