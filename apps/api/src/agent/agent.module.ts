import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DataSourcesModule } from '../data-sources/data-sources.module.js';
import { SemanticModule } from '../semantic/semantic.module.js';
import { QueriesModule } from '../queries/queries.module.js';
import { DashboardsModule } from '../dashboards/dashboards.module.js';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';

@Module({
  imports: [
    AuthModule,
    DataSourcesModule,
    SemanticModule,
    QueriesModule,
    DashboardsModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
