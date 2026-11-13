import { Injectable } from '@nestjs/common';
import pino, { type Logger } from 'pino';
import { loadEnv } from '@autobi/config';
import { captureException } from './sentry.js';

@Injectable()
export class LoggerService {
  readonly logger: Logger;

  constructor() {
    const env = loadEnv();
    this.logger = pino({
      level: env.LOG_LEVEL,
      base: { service: 'autobi-api' },
      redact: {
        paths: [
          'password',
          'req.headers.cookie',
          'req.headers.authorization',
          'apiKey',
          'encryptedConfig',
          'encryptedKey',
        ],
        remove: true,
      },
    });
  }

  child(bindings: Record<string, unknown>) {
    return this.logger.child(bindings);
  }

  captureException(error: unknown, context?: Record<string, unknown>) {
    this.logger.error({ err: error, ...context }, 'unhandled_error');
    captureException(error, context);
  }
}
