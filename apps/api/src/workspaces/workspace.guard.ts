import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { WorkspaceRole } from '@autobi/shared';
import { ForbiddenError, hasMinRole, NotFoundError } from '@autobi/shared';
import { PrismaService } from '../core/prisma.service.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';

export interface WorkspaceRequest extends AuthenticatedRequest {
  workspaceId: string;
  workspaceRole: WorkspaceRole;
}

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return this.check(context, 'Viewer');
  }

  async check(context: ExecutionContext, minRole: WorkspaceRole): Promise<boolean> {
    const req = context.switchToHttp().getRequest<WorkspaceRequest>();
    const workspaceId =
      (req.params?.id as string | undefined) ||
      (req.params?.workspaceId as string | undefined) ||
      (req.body?.workspaceId as string | undefined) ||
      (req.query?.workspaceId as string | undefined);

    if (!workspaceId) throw new ForbiddenError('workspaceId required');

    const membership = await this.prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.userId,
        },
      },
    });

    if (!membership) throw new NotFoundError('Workspace not found');
    if (!hasMinRole(membership.role, minRole)) {
      throw new ForbiddenError('Insufficient workspace permissions');
    }

    req.workspaceId = workspaceId;
    req.workspaceRole = membership.role;
    return true;
  }
}
