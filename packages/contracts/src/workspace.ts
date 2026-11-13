import { z } from 'zod';
import { WorkspaceRoles } from '@autobi/shared';

/** Common IANA zones for workspace timezone setting. */
export const WORKSPACE_TIMEZONES = [
  'UTC',
  'Asia/Tehran',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

export const workspaceTimezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_+\-/]+$/, 'Invalid IANA timezone');

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  timezone: workspaceTimezoneSchema.optional(),
});

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
  timezone: z.string(),
  role: z.enum(WorkspaceRoles),
  createdAt: z.string(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceDto = z.infer<typeof workspaceSchema>;
