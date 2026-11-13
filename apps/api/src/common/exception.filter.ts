import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '@autobi/shared';
import type { LoggerService } from '../core/logger.service.js';
import type { RequestWithId } from './request-id.middleware.js';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger?: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId;

    if (exception instanceof AppError) {
      response.status(exception.statusCode).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          requestId,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json({
        error: {
          code: 'HTTP_ERROR',
          message:
            typeof body === 'string'
              ? body
              : ((body as { message?: string }).message ?? exception.message),
          details: typeof body === 'object' ? body : undefined,
          requestId,
        },
      });
      return;
    }

    this.logger?.captureException(exception, { requestId, path: request.url });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId,
      },
    });
  }
}
