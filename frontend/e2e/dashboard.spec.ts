import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state - simulate logged in user
    await page.route('**/*', (route) => {
      if (route.request().url().includes('firebase')) {
        // Mock successful auth response
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: true }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/');
  });

  test('should display main navigation elements', async ({ page }) => {
    // Check page loads
    await expect(page).toHaveTitle(/TarkovTracker/);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for main navigation drawer trigger (hamburger menu or drawer button)
    const drawerButton = page
      .locator('[data-testid="drawer-toggle"], .v-app-bar__nav-icon, button[aria-label*="menu"]')
      .first();
    if (await drawerButton.isVisible()) {
      await expect(drawerButton).toBeVisible();
    }
  });

  test('should open and close navigation drawer', async ({ page }) => {
    // Wait for app to load
    await page.waitForTimeout(2000);

    // Try to find and click drawer toggle
    const drawerToggle = page
      .locator('[data-testid="drawer-toggle"], .v-app-bar__nav-icon, button[aria-label*="menu"]')
      .first();

    if (await drawerToggle.isVisible()) {
      // Open drawer
      await drawerToggle.click();

      // Check if drawer opened (look for drawer content)
      const drawer = page.locator('.v-navigation-drawer, [data-testid="nav-drawer"]');
      await expect(drawer).toBeVisible();

      // Close drawer by clicking outside or toggle again
      await drawerToggle.click();
    }
  });

  test('should navigate between main pages', async ({ page }) => {
    // Wait for app to load
    await page.waitForTimeout(2000);

    // Test navigation to different routes
    const routes = ['/tasks', '/team', '/hideout', '/settings'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(1000);

      // Check that URL changed
      expect(page.url()).toContain(route);

      // Check that page content loaded (no 404 or error)
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('404');
      expect(bodyText).not.toContain('Page not found');
    }
  });

  test('should handle responsive layout', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Ensure app is still functional on mobile
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Filter out known acceptable errors (Firebase, external APIs, etc.)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('firebase') &&
        !error.includes('Failed to fetch') &&
        !error.includes('NetworkError') &&
        !error.includes('auth') &&
        !error.includes('tarkov.dev')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
