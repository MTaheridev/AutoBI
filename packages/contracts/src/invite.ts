import { z } from 'zod';

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['Admin', 'Member', 'Viewer']).default('Member'),
});

/** Authenticated user accepts an invite matching their email. */
export const acceptInviteSchema = z.object({
  token: z.string().min(10),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
