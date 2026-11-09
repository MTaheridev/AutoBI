import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { loadEnv } from '@autobi/config';

export const INTROSPECTION_QUEUE = 'introspection';

@Injectable()
export class QueueService implements OnModuleDestroy {
  readonly introspection: Queue;

  constructor() {
    const env = loadEnv();
    this.introspection = new Queue(INTROSPECTION_QUEUE, {
      connection: { url: env.REDIS_URL },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });
  }

  async onModuleDestroy() {
    await this.introspection.close();
  }
}
