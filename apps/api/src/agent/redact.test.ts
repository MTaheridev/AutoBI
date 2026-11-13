import { describe, expect, it } from 'vitest';
import { redactSecrets, redactText } from './redact.js';

describe('redactSecrets', () => {
  it('redacts password fields', () => {
    expect(
      redactSecrets({
        host: 'db.example',
        password: 'SuperSecretDbPassword123',
        nested: { apiKey: 'AQ.FakeUnitTestApiKey000' },
      }),
    ).toEqual({
      host: 'db.example',
      password: '[REDACTED]',
      nested: { apiKey: '[REDACTED]' },
    });
  });

  it('redacts inline password strings', () => {
    expect(redactText('password: SuperSecretDbPassword123 please')).toContain('[REDACTED]');
  });
});
