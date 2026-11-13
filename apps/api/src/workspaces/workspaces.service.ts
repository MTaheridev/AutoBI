import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { loadEnv } from '@autobi/config';
import { AppError, NotFoundError, ValidationError } from '@autobi/shared';
import type { WorkspaceRole } from '@autobi/shared';
import { PrismaService } from '../core/prisma.service.js';
import { AuditService } from '../core/audit.service.js';
import { MailService } from '../core/mail.service.js';
import { assertWorkspaceRole } from '../common/membership.js';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async create(userId: string, name: string) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        ownerId: userId,
        memberships: {
          create: {
            userId,
            role: 'Owner',
          },
        },
      },
    });

    return this.toDto(workspace, 'Owner');
  }

  private toDto(
    workspace: {
      id: string;
      name: string;
      ownerId: string;
      timezone: string;
      createdAt: Date;
    },
    role: WorkspaceRole,
  ) {
    return {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerId,
      timezone: workspace.timezone || 'UTC',
      role,
      createdAt: workspace.createdAt.toISOString(),
    };
  }

  async list(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => this.toDto(m.workspace, m.role));
  }

  async get(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });
    if (!membership) throw new NotFoundError('Workspace not found');
    return this.toDto(membership.workspace, membership.role);
  }

  async update(
    userId: string,
    workspaceId: string,
    input: { name?: string; timezone?: string },
  ) {
    await assertWorkspaceRole(this.prisma, userId, workspaceId, 'Admin');
    if (input.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
      } catch {
        throw new ValidationError(`Invalid timezone: ${input.timezone}`);
      }
    }
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
      },
    });
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    await this.audit.record({
      action: 'workspace.update',
      actorId: userId,
      workspaceId,
      metadata: { name: input.name, timezone: input.timezone },
    });
    return this.toDto(workspace, membership?.role ?? 'Admin');
  }

  async createInvite(
    actorId: string,
    workspaceId: string,
    input: { email: string; role: 'Admin' | 'Member' | 'Viewer' },
  ) {
    await assertWorkspaceRole(this.prisma, actorId, workspaceId, 'Admin');
    if (input.role === 'Admin') {
      await assertWorkspaceRole(this.prisma, actorId, workspaceId, 'Owner');
    }

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundError('Workspace not found');

    const token = randomBytes(24).toString('hex');
    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: input.email.toLowerCase(),
        role: input.role,
        token,
        invitedById: actorId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.mail.sendInviteEmail(invite.email, invite.token, workspace.name);

    await this.audit.record({
      action: 'workspace.invite',
      actorId,
      workspaceId,
      metadata: { email: invite.email, role: invite.role, inviteId: invite.id },
    });

    const env = loadEnv();
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role as WorkspaceRole,
      expiresAt: invite.expiresAt.toISOString(),
      // Dev convenience when console mailer is used
      ...(env.NODE_ENV !== 'production' && !env.SMTP_URL ? { token: invite.token } : {}),
    };
  }

  async listInvites(actorId: string, workspaceId: string) {
    await assertWorkspaceRole(this.prisma, actorId, workspaceId, 'Admin');
    const invites = await this.prisma.workspaceInvite.findMany({
      where: { workspaceId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    }));
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({ where: { token } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new ValidationError('Invite is invalid or expired');
    }
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: invite.workspaceId },
    });
    return {
      email: invite.email,
      role: invite.role,
      workspaceName: workspace?.name ?? 'Workspace',
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  /** Logged-in user accepts an invite matching their email. */
  async acceptInvite(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const invite = await this.prisma.workspaceInvite.findUnique({ where: { token } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new ValidationError('Invite is invalid or expired');
    }
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ValidationError('Invite email does not match your account');
    }

    const existing = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    });
    if (existing) {
      await this.prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      throw new AppError('Already a member of this workspace', 'ALREADY_MEMBER', 409);
    }

    await this.prisma.$transaction([
      this.prisma.membership.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        },
      }),
      this.prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
      }),
    ]);

    await this.audit.record({
      action: 'workspace.invite.accept',
      actorId: userId,
      workspaceId: invite.workspaceId,
      metadata: { inviteId: invite.id },
    });

    return this.get(userId, invite.workspaceId);
  }
}
