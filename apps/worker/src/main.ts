import { loadEnv } from '@autobi/config';
import { Worker } from 'bullmq';
import { processIntrospection } from './introspection.processor.js';

const INTROSPECTION_QUEUE = 'introspection';

async function bootstrap() {
  const env = loadEnv();
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
  });

  console.log('Worker listening for introspection jobs');
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
