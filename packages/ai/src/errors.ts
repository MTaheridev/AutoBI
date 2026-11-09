import { AppError } from '@autobi/shared';

export class AIProviderError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AI_PROVIDER_ERROR', 502, details);
    this.name = 'AIProviderError';
  }
}

export class AIRateLimitError extends AppError {
  constructor(message = 'AI provider rate limit exceeded') {
    super(message, 'AI_RATE_LIMIT', 429);
    this.name = 'AIRateLimitError';
  }
}
