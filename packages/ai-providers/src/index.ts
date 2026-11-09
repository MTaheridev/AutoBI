import { aiProviderRegistry } from '@autobi/ai';
import { openaiFactory } from './openai.js';
import { openrouterFactory } from './openrouter.js';

export function registerBuiltinAiProviders(): void {
  aiProviderRegistry.register(openaiFactory);
  aiProviderRegistry.register(openrouterFactory);
}

export { openaiFactory, openrouterFactory };
export * from './openai.js';
export * from './openrouter.js';
