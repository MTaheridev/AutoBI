import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters'),
  SESSION_SECRET: z.string().min(16),
  API_PORT: z.coerce.number().int().positive().default(3101),
  API_CORS_ORIGIN: z.string().default('http://localhost:3100'),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  /** Public web origin for email links (defaults to API_CORS_ORIGIN). */
  APP_PUBLIC_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  /** When "true", allow private/loopback DB hosts (local/dev). Default: true outside production. */
  DB_HOST_ALLOW_PRIVATE: z.enum(['true', 'false']).optional(),
  /** When "false", POST /auth/register is disabled. Default: true outside production. */
  ALLOW_PUBLIC_REGISTRATION: z.enum(['true', 'false']).optional(),
  /** When "true", trust X-Forwarded-* via Express trust proxy (1 hop). */
  TRUST_PROXY: z.enum(['true', 'false']).optional(),
  /** Optional cookie Domain for split-subdomain deployments (e.g. .example.com). */
  COOKIE_DOMAIN: z.string().min(1).optional(),
  /** SMTP URL (e.g. smtp://user:pass@host:587). Required in production for mail. */
  SMTP_URL: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SENTRY_DSN: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
});

export function allowPrivateDbHosts(env: AppEnv = loadEnv()): boolean {
  if (env.DB_HOST_ALLOW_PRIVATE === 'true') return true;
  if (env.DB_HOST_ALLOW_PRIVATE === 'false') return false;
  return env.NODE_ENV !== 'production';
}

export function allowPublicRegistration(env: AppEnv = loadEnv()): boolean {
  if (env.ALLOW_PUBLIC_REGISTRATION === 'true') return true;
  if (env.ALLOW_PUBLIC_REGISTRATION === 'false') return false;
  return env.NODE_ENV !== 'production';
}

export function trustProxy(env: AppEnv = loadEnv()): boolean {
  if (env.TRUST_PROXY === 'true') return true;
  if (env.TRUST_PROXY === 'false') return false;
  return false;
}

export function appPublicUrl(env: AppEnv = loadEnv()): string {
  return env.APP_PUBLIC_URL ?? env.API_CORS_ORIGIN;
}

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${message}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache(): void {
  cached = undefined;
}

export { envSchema };
