import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { AiProvidersController } from './ai-providers.controller.js';
import { AiProvidersService } from './ai-providers.service.js';

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [AiProvidersController],
  providers: [AiProvidersService],
  exports: [AiProvidersService],
})
export class AiProvidersModule {}
