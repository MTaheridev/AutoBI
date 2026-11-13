import { test, expect } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * Smoke e2e. In CI the web app must be reachable (job starts it).
 * Locally, skips if the app is down.
 */
test.describe('AutoBI smoke', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    try {
      const res = await page.request.get('/');
      if (!res.ok()) {
        if (isCI) throw new Error(`Web app returned ${res.status()}`);
        testInfo.skip(true, 'Web app not reachable');
      }
    } catch (err) {
      if (isCI) throw err;
      testInfo.skip(true, 'Web app not reachable');
    }
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('register page renders password policy hint', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
  });

  test('verify-email page renders', async ({ page }) => {
    await page.goto('/verify-email');
    await expect(page.getByRole('heading', { name: /verify email/i })).toBeVisible();
  });
});
