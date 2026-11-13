import { Injectable } from '@nestjs/common';
import { AppError } from '@autobi/shared';
import { RedisService } from '../core/redis.service.js';

const WINDOW_SEC = 60;
const MAX_ATTEMPTS_PER_WINDOW = 20;
const FAIL_WINDOW_SEC = 15 * 60;
const MAX_FAILURES = 5;
const LOCK_SEC = 15 * 60;

@Injectable()
export class AuthThrottleService {
  constructor(private readonly redis: RedisService) {}

  private ipKey(ip: string) {
    return `auth:rl:ip:${ip}`;
  }

  private failKey(email: string) {
    return `auth:fail:${email.toLowerCase()}`;
  }

  private lockKey(email: string) {
    return `auth:lock:${email.toLowerCase()}`;
  }

  async assertNotLocked(email: string): Promise<void> {
    const locked = await this.redis.client.get(this.lockKey(email));
    if (locked) {
      throw new AppError(
        'Too many failed login attempts. Try again later.',
        'AUTH_LOCKED',
        429,
      );
    }
  }

  async assertRateLimit(ip: string): Promise<void> {
    const key = this.ipKey(ip || 'unknown');
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, WINDOW_SEC);
    }
    if (count > MAX_ATTEMPTS_PER_WINDOW) {
      throw new AppError('Too many requests. Try again later.', 'RATE_LIMITED', 429);
    }
  }

  async recordFailure(email: string): Promise<void> {
    const key = this.failKey(email);
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, FAIL_WINDOW_SEC);
    }
    if (count >= MAX_FAILURES) {
      await this.redis.client.set(this.lockKey(email), '1', 'EX', LOCK_SEC);
      await this.redis.client.del(key);
    }
  }

  async clearFailures(email: string): Promise<void> {
    await this.redis.client.del(this.failKey(email), this.lockKey(email));
  }
}
