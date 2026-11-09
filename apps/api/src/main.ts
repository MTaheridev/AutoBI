import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { loadEnv } from '@autobi/config';
import { AppModule } from './app.module.js';
import { AppExceptionFilter } from './common/exception.filter.js';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser(env.SESSION_SECRET));
  app.enableCors({
    origin: env.API_CORS_ORIGIN,
    credentials: true,
  });
  app.useGlobalFilters(new AppExceptionFilter());
  await app.listen(env.API_PORT);
  console.log(`API listening on http://localhost:${env.API_PORT}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
