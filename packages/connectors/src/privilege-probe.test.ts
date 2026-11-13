import { describe, expect, it } from 'vitest';
import { mysqlGrantsLookWritable } from './privilege-probe.js';

describe('mysqlGrantsLookWritable', () => {
  it('flags ALL PRIVILEGES', () => {
    expect(
      mysqlGrantsLookWritable(["GRANT ALL PRIVILEGES ON *.* TO 'root'@'%'"]),
    ).toBe(true);
  });

  it('flags INSERT grants', () => {
    expect(
      mysqlGrantsLookWritable(["GRANT SELECT, INSERT ON app.* TO 'u'@'%'"]),
    ).toBe(true);
  });

  it('allows SELECT-only', () => {
    expect(
      mysqlGrantsLookWritable(["GRANT SELECT ON app.* TO 'ro'@'%'"]),
    ).toBe(false);
  });
});
