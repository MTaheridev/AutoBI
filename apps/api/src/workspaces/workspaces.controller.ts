import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { createWorkspaceSchema } from '@autobi/contracts';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { WorkspacesService } from './workspaces.service.js';

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const items = await this.workspaces.list(req.userId);
    return { workspaces: items };
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: { name: string },
  ) {
    const workspace = await this.workspaces.create(req.userId, body.name);
    return { workspace };
  }

  @Get(':id')
  async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspace = await this.workspaces.get(req.userId, id);
    return { workspace };
  }
}
