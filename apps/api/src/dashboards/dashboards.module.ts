import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { QueriesModule } from '../queries/queries.module.js';
import { DashboardsController } from './dashboards.controller.js';
import { DashboardsService } from './dashboards.service.js';

@Module({
  imports: [AuthModule, QueriesModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
  exports: [DashboardsService],
})
export class DashboardsModule {}
