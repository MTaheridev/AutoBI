import { Injectable } from '@nestjs/common';
import { AppError } from '@autobi/shared';
import { RedisService } from './redis.service.js';

const MAX_PER_WORKSPACE = 5;
const KEY_TTL_SEC = 120;

@Injectable()
export class QueryConcurrencyService {
  constructor(private readonly redis: RedisService) {}

  private key(workspaceId: string) {
    return `ws:qconc:${workspaceId}`;
  }

  async runExclusive<T>(workspaceId: string, fn: () => Promise<T>): Promise<T> {
    const key = this.key(workspaceId);
    const current = await this.redis.client.incr(key);
    if (current === 1) {
      await this.redis.client.expire(key, KEY_TTL_SEC);
    }
    if (current > MAX_PER_WORKSPACE) {
      await this.redis.client.decr(key);
      throw new AppError(
        'Too many concurrent queries for this workspace',
        'QUERY_CONCURRENCY',
        429,
      );
    }
    try {
      await this.redis.client.expire(key, KEY_TTL_SEC);
      return await fn();
    } finally {
      const next = await this.redis.client.decr(key);
      if (next <= 0) {
        await this.redis.client.del(key);
      }
    }
  }
}
