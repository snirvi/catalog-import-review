import { expect, test } from '@playwright/test';

test('review a sample, download errors, and recheck corrected data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample CSV' }).click();
  await expect(page.getByRole('status')).toContainText('1 valid, 3 need attention');
  await page.getByLabel('Filter by field').selectOption('price');
  await expect(page.getByRole('table')).toContainText('non-negative price');
  await expect(page.getByRole('table')).not.toContainText('SKU already');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download error report' }).click();
  expect((await download).suggestedFilename()).toBe('catalog-errors.csv');
  await page.getByLabel('Catalogue CSV').setInputFiles('../samples/catalog-fixed.csv');
  await page.getByRole('button', { name: 'Validate CSV' }).click();
  await expect(page.getByText('All rows passed validation.')).toBeVisible();
});
