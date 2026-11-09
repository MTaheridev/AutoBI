import type { AIProvider, AIProviderFactory } from './types.js';
import { AIProviderError } from './errors.js';

export class AIProviderRegistry {
  private readonly factories = new Map<string, AIProviderFactory>();

  register(factory: AIProviderFactory): void {
    this.factories.set(factory.name, factory);
  }

  list(): string[] {
    return [...this.factories.keys()];
  }

  create(name: string, apiKey: string): AIProvider {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new AIProviderError(`Unknown AI provider: ${name}`);
    }
    return factory.create(apiKey);
  }
}

export const aiProviderRegistry = new AIProviderRegistry();
