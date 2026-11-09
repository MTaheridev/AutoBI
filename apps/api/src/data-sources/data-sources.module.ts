import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { DataSourcesController } from './data-sources.controller.js';
import { DataSourcesService } from './data-sources.service.js';

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [DataSourcesController],
  providers: [DataSourcesService],
  exports: [DataSourcesService],
})
export class DataSourcesModule {}
