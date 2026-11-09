import { z } from 'zod';

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const jobStatusSchema = z.object({
  jobId: z.string(),
  status: z.enum(['queued', 'active', 'completed', 'failed']),
  progress: z.number().optional(),
  error: z.string().optional(),
  result: z.unknown().optional(),
});

export type JobStatus = z.infer<typeof jobStatusSchema>;
