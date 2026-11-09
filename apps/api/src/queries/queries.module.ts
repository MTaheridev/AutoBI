import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { QueriesController } from './queries.controller.js';
import { QueriesService } from './queries.service.js';

@Module({
  imports: [AuthModule],
  controllers: [QueriesController],
  providers: [QueriesService],
  exports: [QueriesService],
})
export class QueriesModule {}
