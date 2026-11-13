import { ForbiddenError, NotFoundError, type WorkspaceRole, hasMinRole } from '@autobi/shared';
import type { PrismaService } from '../core/prisma.service.js';

export async function assertWorkspaceRole(
  prisma: PrismaService,
  userId: string,
  workspaceId: string,
  minRole: WorkspaceRole = 'Viewer',
) {
  const membership = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) throw new NotFoundError('Workspace not found');
  if (!hasMinRole(membership.role as WorkspaceRole, minRole)) {
    throw new ForbiddenError(`Requires ${minRole} role or higher`);
  }
  return membership;
}
