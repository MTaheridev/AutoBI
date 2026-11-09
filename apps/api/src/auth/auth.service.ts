import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AppError, UnauthorizedError } from '@autobi/shared';
import { PrismaService } from '../core/prisma.service.js';
import { SessionService } from '../core/session.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async register(input: { email: string; password: string; name?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new AppError('Email already registered', 'EMAIL_TAKEN', 409);

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name ?? null,
      },
    });

    const sessionId = await this.sessions.create({ userId: user.id, email: user.email });
    return { user: this.toDto(user), sessionId };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    const sessionId = await this.sessions.create({ userId: user.id, email: user.email });
    return { user: this.toDto(user), sessionId };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError();
    return this.toDto(user);
  }

  async logout(sessionId: string) {
    await this.sessions.destroy(sessionId);
  }

  private toDto(user: { id: string; email: string; name: string | null; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
