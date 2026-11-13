import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { loginSchema, registerSchema, verifyEmailSchema } from '@autobi/contracts';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { clearSessionCookie, setSessionCookie } from '../common/cookie.js';
import { clientIp } from '../common/client-ip.js';
import { AuthService } from './auth.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';
import { SESSION_COOKIE } from '../core/session.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Req() req: Request,
    @Body(new ZodValidationPipe(registerSchema))
    body: { email: string; password: string; name?: string; inviteToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(body, clientIp(req));
    setSessionCookie(res, SESSION_COOKIE, result.sessionId);
    return {
      user: result.user,
      ...(result.emailVerificationToken
        ? { emailVerificationToken: result.emailVerificationToken }
        : {}),
    };
  }

  @Post('verify-email')
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: { token: string },
  ) {
    return this.auth.verifyEmail(body.token);
  }

  @Post('login')
  async login(
    @Req() req: Request,
    @Body(new ZodValidationPipe(loginSchema)) body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(body, clientIp(req));
    setSessionCookie(res, SESSION_COOKIE, result.sessionId);
    return { user: result.user };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(req.sessionId, req.userId);
    clearSessionCookie(res, SESSION_COOKIE);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const user = await this.auth.me(req.userId);
    return { user };
  }
}
