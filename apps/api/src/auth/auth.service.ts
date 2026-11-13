import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { allowPublicRegistration, loadEnv } from '@autobi/config';
import { AppError, ForbiddenError, UnauthorizedError, ValidationError } from '@autobi/shared';
import { PrismaService } from '../core/prisma.service.js';
import { SessionService } from '../core/session.service.js';
import { AuditService } from '../core/audit.service.js';
import { RedisService } from '../core/redis.service.js';
import { MailService } from '../core/mail.service.js';
import { AuthThrottleService } from './auth-throttle.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly throttle: AuthThrottleService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  async register(
    input: {
      email: string;
      password: string;
      name?: string;
      inviteToken?: string;
    },
    ip: string,
  ) {
    const hasInvite = Boolean(input.inviteToken);
    if (!hasInvite && !allowPublicRegistration()) {
      throw new ForbiddenError('Public registration is disabled');
    }
    await this.throttle.assertRateLimit(ip);

    let invite: {
      id: string;
      workspaceId: string;
      email: string;
      role: 'Owner' | 'Admin' | 'Member' | 'Viewer';
      expiresAt: Date;
      acceptedAt: Date | null;
    } | null = null;

    if (input.inviteToken) {
      invite = await this.prisma.workspaceInvite.findUnique({
        where: { token: input.inviteToken },
      });
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        throw new ValidationError('Invite is invalid or expired');
      }
      if (invite.email.toLowerCase() !== input.email.toLowerCase()) {
        throw new ValidationError('Invite email does not match');
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) throw new AppError('Email already registered', 'EMAIL_TAKEN', 409);

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name ?? null,
        emailVerifiedAt: invite ? new Date() : null,
      },
    });

    if (invite) {
      await this.prisma.$transaction([
        this.prisma.membership.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: user.id,
            role: invite.role,
          },
        }),
        this.prisma.workspaceInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        }),
      ]);
    }

    const verifyToken = invite ? null : await this.issueEmailVerifyToken(user.id);
    if (verifyToken) {
      await this.mail.sendVerifyEmail(user.email, verifyToken);
    }

    const sessionId = await this.sessions.create({ userId: user.id, email: user.email });
    await this.audit.record({
      action: 'auth.register',
      actorId: user.id,
      workspaceId: invite?.workspaceId,
      metadata: { email: user.email, viaInvite: Boolean(invite) },
    });

    const env = loadEnv();
    return {
      user: this.toDto(user),
      sessionId,
      // Dev convenience only when console mailer is used
      ...(env.NODE_ENV !== 'production' && verifyToken && !env.SMTP_URL
        ? { emailVerificationToken: verifyToken }
        : {}),
    };
  }

  async verifyEmail(token: string) {
    const userId = await this.redis.client.get(`email:verify:${token}`);
    if (!userId) throw new ValidationError('Invalid or expired verification token');
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    await this.redis.client.del(`email:verify:${token}`);
    await this.audit.record({ action: 'auth.email_verified', actorId: userId });
    return { ok: true };
  }

  async login(input: { email: string; password: string }, ip: string) {
    await this.throttle.assertRateLimit(ip);
    await this.throttle.assertNotLocked(input.email);

    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user) {
      await this.throttle.recordFailure(input.email);
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      await this.throttle.recordFailure(input.email);
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenError('Email not verified. Check your inbox for a verification link.');
    }

    await this.throttle.clearFailures(input.email);
    const sessionId = await this.sessions.create({ userId: user.id, email: user.email });
    await this.audit.record({
      action: 'auth.login',
      actorId: user.id,
      metadata: { email: user.email },
    });
    return { user: this.toDto(user), sessionId };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError();
    return this.toDto(user);
  }

  async logout(sessionId: string, userId: string) {
    await this.sessions.destroy(sessionId);
    await this.audit.record({ action: 'auth.logout', actorId: userId });
  }

  private async issueEmailVerifyToken(userId: string): Promise<string> {
    const token = randomBytes(24).toString('hex');
    await this.redis.client.set(`email:verify:${token}`, userId, 'EX', 60 * 60 * 24);
    return token;
  }

  private toDto(user: {
    id: string;
    email: string;
    name: string | null;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
