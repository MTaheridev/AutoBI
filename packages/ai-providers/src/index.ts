import { aiProviderRegistry } from '@autobi/ai';
import { openaiFactory } from './openai.js';
import { openrouterFactory } from './openrouter.js';
import { geminiFactory } from './gemini.js';

let registered = false;

export function registerBuiltinAiProviders(): void {
  if (registered) return;
  aiProviderRegistry.register(openaiFactory);
  aiProviderRegistry.register(openrouterFactory);
  aiProviderRegistry.register(geminiFactory);
  registered = true;
}

export { openaiFactory, openrouterFactory, geminiFactory };
export * from './openai.js';
export * from './openrouter.js';
export * from './gemini.js';
export * from './http.js';
