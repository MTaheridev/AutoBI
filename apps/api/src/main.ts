import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { loadEnv, trustProxy } from '@autobi/config';
import { AppModule } from './app.module.js';
import { AppExceptionFilter } from './common/exception.filter.js';
import { csrfOriginMiddleware } from './common/csrf.middleware.js';
import { requestIdMiddleware } from './common/request-id.middleware.js';
import { LoggerService } from './core/logger.service.js';
import { initSentry } from './core/sentry.js';

async function bootstrap() {
  const env = loadEnv();
  initSentry(env.SENTRY_DSN);
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(LoggerService);
  if (trustProxy(env)) {
    const expressApp = app.getHttpAdapter().getInstance() as {
      set: (key: string, value: unknown) => void;
    };
    expressApp.set('trust proxy', 1);
  }
  app.setGlobalPrefix('api/v1');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(requestIdMiddleware);
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(csrfOriginMiddleware);
  app.enableCors({
    origin: env.API_CORS_ORIGIN,
    credentials: true,
  });
  app.useGlobalFilters(new AppExceptionFilter(logger));
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
  logger.logger.info({ port: env.API_PORT }, 'api_listening');
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
