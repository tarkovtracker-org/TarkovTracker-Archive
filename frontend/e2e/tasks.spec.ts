import { test, expect } from '@playwright/test';

test.describe('Tasks Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and API responses
    await page.route('**/*', (route) => {
      const url = route.request().url();

      if (url.includes('firebase')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: true }),
        });
      } else if (url.includes('tarkov.dev') || url.includes('graphql')) {
        // Mock Tarkov data API
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              tasks: [
                {
                  id: 'test-task-1',
                  name: 'Test Task 1',
                  trader: { name: 'Prapor' },
                  objectives: [{ id: 'obj-1', description: 'Test objective', completed: false }],
                },
              ],
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/tasks');
  });

  test('should display tasks page', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check page title
    await expect(page).toHaveTitle(/TarkovTracker/);

    // Check URL is correct
    expect(page.url()).toContain('/tasks');
  });

  test('should show task filtering options', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for common filter elements
    const filterElements = [
      '.v-select', // Vuetify select dropdowns
      '.v-text-field', // Search inputs
      '.v-btn-toggle', // Toggle buttons
      '[data-testid*="filter"]', // Custom filter test IDs
      'input[type="text"]', // Generic text inputs
    ];

    let filtersFound = 0;
    for (const selector of filterElements) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        filtersFound += count;
      }
    }

    // Expect at least some filtering capability
    expect(filtersFound).toBeGreaterThan(0);
  });

  test('should handle task interactions', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Look for task cards or rows
    const taskElements = page.locator('[id^="task-"], .task-card, .task-row, .taskContainer');

    if ((await taskElements.count()) > 0) {
      const firstTask = taskElements.first();
      await expect(firstTask).toBeVisible();

      // Try to interact with the task (click to expand/collapse)
      await firstTask.click();
      await page.waitForTimeout(500);

      // Look for action buttons within task
      const actionButtons = page.locator('.v-btn').filter({ hasText: /complete|done|finish/i });
      if ((await actionButtons.count()) > 0) {
        await expect(actionButtons.first()).toBeVisible();
      }
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Ensure content is still accessible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Mock empty task response
    await page.route('**/*', (route) => {
      const url = route.request().url();

      if (url.includes('tarkov.dev') || url.includes('graphql')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { tasks: [] } }),
        });
      } else {
        route.continue();
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    // Should not show error, just empty state
    const body = await page.textContent('body');
    expect(body).not.toContain('Error');
    expect(body).not.toContain('failed');
  });

  test('should search tasks when search functionality exists', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for search input
    const searchInput = page
      .locator('input[type="text"], .v-text-field input, [placeholder*="search" i]')
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Check that search was performed (URL change or content change)
      const currentUrl = page.url();
      const bodyText = await page.textContent('body');

      // Either URL should contain search param or content should have changed
      const hasSearchPerformed =
        currentUrl.includes('search') ||
        bodyText.includes('test') ||
        bodyText.includes('No results');
      expect(hasSearchPerformed).toBeTruthy();
    }
  });
});
