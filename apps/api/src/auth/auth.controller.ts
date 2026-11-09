import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { loginSchema, registerSchema } from '@autobi/contracts';
import { loadEnv } from '@autobi/config';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthService } from './auth.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';
import { SESSION_COOKIE } from '../core/session.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setSessionCookie(res: Response, sessionId: string) {
    const env = loadEnv();
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: { email: string; password: string; name?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(body);
    this.setSessionCookie(res, result.sessionId);
    return { user: result.user };
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(body);
    this.setSessionCookie(res, result.sessionId);
    return { user: result.user };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(req.sessionId);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const user = await this.auth.me(req.userId);
    return { user };
  }
}
