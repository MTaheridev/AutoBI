import { Injectable } from '@nestjs/common';
import { NotFoundError } from '@autobi/shared';
import { PrismaService } from '../core/prisma.service.js';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerId,
      role: 'Owner' as const,
      createdAt: workspace.createdAt.toISOString(),
    };
  }

  async list(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      ownerId: m.workspace.ownerId,
      role: m.role,
      createdAt: m.workspace.createdAt.toISOString(),
    }));
  }

  async get(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });
    if (!membership) throw new NotFoundError('Workspace not found');
    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      ownerId: membership.workspace.ownerId,
      role: membership.role,
      createdAt: membership.workspace.createdAt.toISOString(),
    };
  }
}
