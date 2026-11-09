import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service.js';
import { RedisService } from '../core/redis.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    await this.redis.client.ping();
    return { status: 'ready' };
  }
}
