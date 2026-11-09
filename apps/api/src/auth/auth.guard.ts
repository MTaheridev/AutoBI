import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { UnauthorizedError } from '@autobi/shared';
import { SessionService, SESSION_COOKIE } from '../core/session.service.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
  sessionId: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!sessionId) throw new UnauthorizedError();

    const session = await this.sessions.get(sessionId);
    if (!session) throw new UnauthorizedError();

    await this.sessions.touch(sessionId);
    req.userId = session.userId;
    req.userEmail = session.email;
    req.sessionId = sessionId;
    return true;
  }
}
