import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  acceptInviteSchema,
  createInviteSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from '@autobi/contracts';
import { ForbiddenError } from '@autobi/shared';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { WorkspacesService } from './workspaces.service.js';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get('invites/preview')
  async previewInvite(@Query('token') token: string) {
    if (!token) throw new ForbiddenError('token required');
    const invite = await this.workspaces.getInviteByToken(token);
    return { invite };
  }

  @Post('invites/accept')
  @UseGuards(AuthGuard)
  async acceptInvite(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(acceptInviteSchema)) body: { token: string },
  ) {
    const workspace = await this.workspaces.acceptInvite(req.userId, body.token);
    return { workspace };
  }

  @Get()
  @UseGuards(AuthGuard)
  async list(@Req() req: AuthenticatedRequest) {
    const items = await this.workspaces.list(req.userId);
    return { workspaces: items };
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: { name: string },
  ) {
    const workspace = await this.workspaces.create(req.userId, body.name);
    return { workspace };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspace = await this.workspaces.get(req.userId, id);
    return { workspace };
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema))
    body: { name?: string; timezone?: string },
  ) {
    const workspace = await this.workspaces.update(req.userId, id, body);
    return { workspace };
  }

  @Get(':id/invites')
  @UseGuards(AuthGuard)
  async listInvites(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const invites = await this.workspaces.listInvites(req.userId, id);
    return { invites };
  }

  @Post(':id/invites')
  @UseGuards(AuthGuard)
  async createInvite(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createInviteSchema))
    body: { email: string; role: 'Admin' | 'Member' | 'Viewer' },
  ) {
    const invite = await this.workspaces.createInvite(req.userId, id, body);
    return { invite };
  }
}
