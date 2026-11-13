import { loadEnv } from '@autobi/config';
import { prisma } from '@autobi/database';
import { Worker } from 'bullmq';
import { processIntrospection } from './introspection.processor.js';
import { captureException, initSentry } from './sentry.js';

const INTROSPECTION_QUEUE = 'introspection';

async function bootstrap() {
  const env = loadEnv();
  initSentry(env.SENTRY_DSN);
  console.log('Worker starting...');

  const worker = new Worker(
    INTROSPECTION_QUEUE,
    async (job) => {
      if (job.name === 'introspect') {
        return processIntrospection(job.data as { dataSourceId: string; workspaceId: string });
      }
      throw new Error(`Unknown job: ${job.name}`);
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 2,
    },
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
    captureException(error, { jobId: job?.id, queue: INTROSPECTION_QUEUE });
  });

  const shutdown = async (signal: string) => {
    console.log(`Worker received ${signal}, shutting down…`);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  console.log('Worker listening for introspection jobs');
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
