import { describe, expect, it } from 'vitest';
import { hasMinRole } from '@autobi/shared';

describe('workspace authorization', () => {
  it('owners satisfy admin requirements', () => {
    expect(hasMinRole('Owner', 'Admin')).toBe(true);
  });

  it('viewers cannot satisfy member requirements', () => {
    expect(hasMinRole('Viewer', 'Member')).toBe(false);
  });

  it('members satisfy viewer requirements', () => {
    expect(hasMinRole('Member', 'Viewer')).toBe(true);
  });
});
