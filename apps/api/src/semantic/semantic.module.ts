import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SemanticController } from './semantic.controller.js';
import { SemanticService } from './semantic.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SemanticController],
  providers: [SemanticService],
  exports: [SemanticService],
})
export class SemanticModule {}
