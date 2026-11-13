import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import { AiProvidersModule } from './ai-providers/ai-providers.module.js';
import { DataSourcesModule } from './data-sources/data-sources.module.js';
import { SemanticModule } from './semantic/semantic.module.js';
import { QueriesModule } from './queries/queries.module.js';
import { DashboardsModule } from './dashboards/dashboards.module.js';
import { AgentModule } from './agent/agent.module.js';
import { HealthModule } from './health/health.module.js';
import { CoreModule } from './core/core.module.js';

@Module({
  imports: [
    CoreModule,
    HealthModule,
    AuthModule,
    WorkspacesModule,
    AiProvidersModule,
    DataSourcesModule,
    SemanticModule,
    QueriesModule,
    DashboardsModule,
    AgentModule,
  ],
})
export class AppModule {}

