import { PipeTransform, Injectable } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ValidationError } from '@autobi/shared';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.flatten());
    }
    return result.data;
  }
}
