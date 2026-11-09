import { z } from 'zod';
import { WorkspaceRoles } from '@autobi/shared';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
});

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
  role: z.enum(WorkspaceRoles),
  createdAt: z.string(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type WorkspaceDto = z.infer<typeof workspaceSchema>;
