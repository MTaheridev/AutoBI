import { Injectable } from '@nestjs/common';
import { AppError } from '@autobi/shared';
import { RedisService } from './redis.service.js';

const WINDOW_SEC = 60;
/** Per-workspace caps within a 60s window. */
const LIMITS = {
  queryExecute: 30,
  aiDashboard: 10,
  semanticPropose: 10,
} as const;

export type WorkspaceThrottleAction = keyof typeof LIMITS;

@Injectable()
export class WorkspaceThrottleService {
  constructor(private readonly redis: RedisService) {}

  async assert(
    workspaceId: string,
    action: WorkspaceThrottleAction,
    userId?: string,
  ): Promise<void> {
    const key = `ws:rl:${action}:${workspaceId}${userId ? `:${userId}` : ''}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, WINDOW_SEC);
    }
    if (count > LIMITS[action]) {
      throw new AppError(
        'Too many requests for this workspace. Try again later.',
        'RATE_LIMITED',
        429,
      );
    }
  }
}
