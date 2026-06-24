import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const currentSamplePath = resolve('docs/samples/sample-project.studiowire.json');
const invalidSamplePath = resolve('docs/samples/invalid/invalid-project-status.studiowire.json');
const legacyFixturePaths = ['0-2-7-1', '0-2-7-0', '0-2-6-0', '0-2-5-1', '0-2-4-1', '0-1-0'].map((version) =>
  resolve(`docs/samples/legacy/project-${version}.studiowire.json`),
);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('boots empty and loads the sample project', async ({ page }) => {
  await expect(page.getByText('Untitled Project')).toBeVisible();
  await loadSample(page);
  await expectProject(page, 'Demo Studio');
});

test('creates a location, rack, device, and terminal block', async ({ page }) => {
  await page.getByText('Create location or device').click({ button: 'right' });
  await page.getByText('Add Location').click();
  await page.locator('#location-name').fill('E2E Room');
  await page.locator('#location-type').fill('test_room');
  await page.getByRole('button', { name: 'Add Location' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Room' })).toBeVisible();

  await page.getByRole('button', { name: /^E2E Room 0$/ }).click({ button: 'right' });
  await page.getByText('Add Rack').click();
  await page.locator('#rack-name').fill('E2E Rack');
  await page.getByRole('button', { name: 'Add Rack' }).click();
  await expect(page.getByRole('button', { name: /E2E Rack 42 RU/ })).toBeVisible();

  await page.getByRole('button', { name: /^E2E Room 1$/ }).click({ button: 'right' });
  await page.getByText('Add Device').click();
  await page.locator('#device-name').fill('E2E Device');
  await page.getByRole('button', { name: 'Create Device' }).click();
  await expect(page.getByRole('button', { name: /E2E Device E2E-DEVICE/ })).toBeVisible();

  await page.getByRole('button', { name: /^E2E Room 2$/ }).click({ button: 'right' });
  await page.getByText('Add TB').click();
  await page.locator('#tb-name').fill('E2E TB');
  await page.locator('#tb-count').fill('1');
  await page.getByRole('button', { name: 'Create TB' }).click();
  await expect(page.getByRole('button', { name: /E2E TB TB/ })).toBeVisible();
});

test('connects, disconnects, reloads, and restores persistence', async ({ page }) => {
  await loadSample(page);
  await page.getByText('Router 1').click();
  await page.getByLabel('Connect RTR1-OUT-001').click();
  await page.getByLabel('Search ports').fill('MV1');
  await page.getByText('MV1-IN-001').first().click();
  await expect(page.getByText(/connected RTR1-OUT-001 to MV1-IN-001/)).toBeVisible();
  await page.getByLabel('Connect RTR1-OUT-001').click();
  await page.getByText('Clear connection').click();
  await expect(page.getByText('Connection cleared for RTR1-OUT-001')).toBeVisible();
  await page.getByLabel('Connect RTR1-OUT-001').click();
  await page.getByLabel('Search ports').fill('MV1');
  await page.getByText('MV1-IN-001').first().click();
  await page.reload();
  await expectProject(page, 'Demo Studio');
});

test('imports current and legacy fixtures', async ({ page }) => {
  await importProject(page, currentSamplePath);
  await expectProject(page, 'Demo Studio');

  for (const fixturePath of legacyFixturePaths) {
    await importProject(page, fixturePath);
    await expectProject(page, 'Demo Studio');
    await expect(page.getByText('Schema 0.2.7.3', { exact: true })).toBeVisible();
  }
});

test('rejects malformed import without losing the open project', async ({ page }) => {
  await loadSample(page);
  await importProject(page, invalidSamplePath);
  await expect(page.getByRole('alert')).toContainText('status');
  await expectProject(page, 'Demo Studio');
});

test('edits settings and connector compatibility data', async ({ page }) => {
  await loadSample(page);
  await page.getByLabel('Project actions').click();
  await page.getByText('Project Settings').click();
  await page.getByRole('tab', { name: 'Connectors' }).click();
  await page.getByPlaceholder('New connector').fill('E2E Connector');
  await page.getByRole('button', { name: 'Add Connector' }).click();
  await expect(page.locator('input[value="E2E Connector"]')).toBeVisible();
  await page.getByRole('tab', { name: 'Connector Groups' }).click();
  await expect(page.getByText('Video connector group')).toBeVisible();
});

test('retires a device and blocks reconnection candidates', async ({ page }) => {
  await loadSample(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByText('Multiviewer 1').click();
  await page.getByRole('button', { name: 'Retire Device' }).click();
  await page.getByText('Router 1').click();
  await page.getByLabel('Connect RTR1-OUT-001').click();
  await page.getByLabel('Search ports').fill('MV1');
  await expect(page.getByText('No matching ports.')).toBeVisible();
});

test('exports and re-imports JSON', async ({ page }) => {
  await loadSample(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByLabel('Project actions').click();
  await page.getByText('Export JSON').click();
  const download = await downloadPromise;
  const path = await download.path();

  expect(path).toBeTruthy();
  await importProject(page, path ?? currentSamplePath);
  await expectProject(page, 'Demo Studio');
});

test('handles storage failure and recovers from valid stored data', async ({ browser }) => {
  const blockedPage = await browser.newPage();
  await blockedPage.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked storage');
      },
    });
  });
  await blockedPage.goto('/');
  await expect(blockedPage.getByText(/Autosave unavailable/)).toBeVisible();
  await blockedPage.close();

  const page = await browser.newPage();
  await page.addInitScript(
    (sample) => {
      window.localStorage.setItem('studiowire.io.project.current', '{');
      window.localStorage.setItem('studiowire.io.project.v0.2.7', sample);
    },
    readFileSync(currentSamplePath, 'utf8').replace('0.2.7.3', '0.2.7.1'),
  );
  await page.goto('/');
  await expectProject(page, 'Demo Studio');
  await page.close();
});

async function expectProject(page: Page, name: string) {
  await expect(page.locator('.app-brand-project', { hasText: name })).toBeVisible();
}

async function loadSample(page: Page) {
  await page.getByLabel('Project actions').click();
  await page.getByText('Load Sample').click();
}

async function importProject(page: Page, path: string) {
  await page.locator('input[aria-label="Import Project JSON"]').setInputFiles(path);
}
