import { describe, expect, it } from 'vitest';
import { jobBelongsToWorkspace } from './data-sources.service.js';

describe('jobBelongsToWorkspace', () => {
  it('allows jobs whose payload matches the workspace', () => {
    expect(
      jobBelongsToWorkspace(
        { data: { workspaceId: 'ws-a', dataSourceId: 'ds-1' } },
        'ws-a',
      ),
    ).toBe(true);
  });

  it('rejects jobs from another workspace (IDOR)', () => {
    expect(
      jobBelongsToWorkspace(
        { data: { workspaceId: 'ws-b', dataSourceId: 'ds-1' } },
        'ws-a',
      ),
    ).toBe(false);
  });

  it('rejects missing jobs and missing workspaceId on payload', () => {
    expect(jobBelongsToWorkspace(null, 'ws-a')).toBe(false);
    expect(jobBelongsToWorkspace(undefined, 'ws-a')).toBe(false);
    expect(jobBelongsToWorkspace({ data: {} }, 'ws-a')).toBe(false);
    expect(jobBelongsToWorkspace({}, 'ws-a')).toBe(false);
  });
});
