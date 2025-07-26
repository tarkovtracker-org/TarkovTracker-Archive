import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('should display login page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/TarkovTracker/);

    // Check main heading
    await expect(page.locator('h2')).toContainText('Sign in to access your account');

    // Check auth buttons exist
    await expect(page.locator('.google-btn')).toBeVisible();
    await expect(page.locator('.github-btn')).toBeVisible();

    // Check buttons have correct text
    await expect(page.locator('.google-btn')).toContainText('Continue with Google');
    await expect(page.locator('.github-btn')).toContainText('Continue with GitHub');
  });

  test('should show loading state when clicking Google sign in', async ({ page }) => {
    const googleBtn = page.locator('.google-btn');

    // Mock the Firebase auth to prevent actual login
    await page.route('**/*', (route) => {
      if (route.request().url().includes('firebase')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await googleBtn.click();
    await expect(googleBtn).toHaveAttribute('loading');
  });

  test('should show loading state when clicking GitHub sign in', async ({ page }) => {
    const githubBtn = page.locator('.github-btn');

    // Mock the Firebase auth to prevent actual login
    await page.route('**/*', (route) => {
      if (route.request().url().includes('firebase')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await githubBtn.click();
    await expect(githubBtn).toHaveAttribute('loading');
  });

  test('should have privacy and terms links', async ({ page }) => {
    const privacyLink = page.locator('a[href="/privacy"]');
    const termsLink = page.locator('a[href="/terms"]');

    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toContainText('Privacy Policy');

    await expect(termsLink).toBeVisible();
    await expect(termsLink).toContainText('Terms of Service');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that auth card is still visible and properly sized
    const authCard = page.locator('.auth-card');
    await expect(authCard).toBeVisible();

    // Check buttons are still clickable
    await expect(page.locator('.google-btn')).toBeVisible();
    await expect(page.locator('.github-btn')).toBeVisible();
  });
});
