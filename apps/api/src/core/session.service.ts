import { Injectable } from '@nestjs/common';
import { createId } from '@autobi/shared';
import { RedisService } from './redis.service.js';

export interface SessionData {
  userId: string;
  email: string;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_COOKIE = 'autobi_session';

@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  private key(sessionId: string) {
    return `session:${sessionId}`;
  }

  async create(data: SessionData): Promise<string> {
    const sessionId = createId();
    await this.redis.client.set(
      this.key(sessionId),
      JSON.stringify(data),
      'EX',
      SESSION_TTL_SECONDS,
    );
    return sessionId;
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const raw = await this.redis.client.get(this.key(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  }

  async destroy(sessionId: string): Promise<void> {
    await this.redis.client.del(this.key(sessionId));
  }

  async touch(sessionId: string): Promise<void> {
    await this.redis.client.expire(this.key(sessionId), SESSION_TTL_SECONDS);
  }
}
