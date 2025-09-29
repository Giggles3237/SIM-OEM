import { test, expect } from '@playwright/test';

test.describe('SimOEM onboarding', () => {
  test.skip(true, 'Full E2E flow requires running API + DB. Skipping in CI until backend harness is available.');

  test('can render dashboard and advance month', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name: /New Game/i }).click();
    await expect(page.getByText(/Market Allocation/i)).toBeVisible();
  });
});
