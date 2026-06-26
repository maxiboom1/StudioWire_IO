import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const currentSamplePath = resolve('docs/samples/sample-project.studiowire.json');
const invalidSamplePath = resolve('docs/samples/invalid/invalid-project-status.studiowire.json');
const legacyFixturePaths = [
  '0-2-8-5',
  '0-2-8-4',
  '0-2-8-3',
  '0-2-8-2',
  '0-2-8-1',
  '0-2-8-0',
  '0-2-7-3',
  '0-2-7-2',
  '0-2-7-1',
  '0-2-7-0',
  '0-2-6-0',
  '0-2-5-1',
  '0-2-4-1',
  '0-1-0',
].map((version) => resolve(`docs/samples/legacy/project-${version}.studiowire.json`));

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  watchPageErrors(page);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

test('boots empty and loads the sample project', async ({ page }) => {
  await expect(page.getByText('Untitled Project')).toBeVisible();
  await loadSample(page);
  await expectProject(page, 'Demo Studio');
});

test('completes the v0.2 project lifecycle and preserves exported data after import', async ({ page }) => {
  await expectProject(page, 'Untitled Project');
  await configureSettings(page);
  await createLocation(page, 'E2E Room');
  await createRack(page, 'E2E Room', 'E2E Rack');
  await createDevice(page, 'E2E Room', 'E2E Source');
  await createDevice(page, 'E2E Room', 'E2E Destination');
  await createTerminalBlock(page, 'E2E Room', 'E2E TB A', 1);
  await createTerminalBlock(page, 'E2E Room', 'E2E TB B', 2);

  await connectPorts(page, 'E2E Source', 'E2E-SOURCE-OUT-001', 'E2E-DESTINATION-IN-001');
  await clearConnection(page, 'E2E Source', 'E2E-SOURCE-OUT-001');
  await connectPorts(page, 'E2E Source', 'E2E-SOURCE-OUT-001', 'E2E-DESTINATION-IN-001');
  await connectPorts(page, 'E2E Source', 'E2E-SOURCE-OUT-002', 'E2E-TB-A (R)-01');
  await connectPorts(page, 'E2E TB A', 'E2E-TB-A (F)-01', 'E2E-TB-B (F)-01');

  await page.getByRole('button', { name: /E2E Destination/ }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Retire Device' }).click();
  await page.getByRole('button', { name: /E2E Source/ }).click();
  await page.getByLabel('Connect E2E-SOURCE-OUT-001').click();
  await page.getByLabel('Search ports').fill('E2E-DESTINATION-IN-001');
  await expect(page.getByText('No matching ports.')).toBeVisible();
  await page.keyboard.press('Escape');

  await validateProject(page);
  await page.getByRole('button', { name: 'Cables' }).click();
  await expect(page.getByText(/of \d+ cable\(s\) shown/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter System status' })).toBeVisible();

  await page.reload();
  await expectProject(page, 'Untitled Project');
  await expect(page.getByRole('button', { name: /E2E Source/ })).toBeVisible();

  const exportedBeforeImport = await exportProject(page);
  const beforeDomainData = normalizeExportedDomainData(exportedBeforeImport);

  await createNewProject(page);
  await expectProject(page, 'Untitled Project');
  await importProject(page, exportedBeforeImport.path);
  await expect(page.getByRole('button', { name: /E2E Source/ })).toBeVisible();

  const exportedAfterImport = await exportProject(page);

  expect(normalizeExportedDomainData(exportedAfterImport)).toEqual(beforeDomainData);
});

test('imports current and legacy fixtures', async ({ page }) => {
  await importProject(page, currentSamplePath);
  await expectProject(page, 'Demo Studio');

  for (const fixturePath of legacyFixturePaths) {
    await importProject(page, fixturePath);
    await expectProject(page, 'Demo Studio');
    await expect(page.getByText('Schema 0.2.8.6', { exact: true })).toBeVisible();
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
  await configureSettings(page);
  await page.getByRole('tab', { name: 'Connector Groups' }).click();
  await expect(page.getByText('Video connector group')).toBeVisible();
});

test('creates a device through Add Device defaults and port-group edits', async ({ page }) => {
  await loadSample(page);
  await locationButton(page, 'Machine Room').click({ button: 'right' });
  await page.getByText('Add Device').click();

  await expect(page.getByRole('heading', { name: 'Add Device' })).toBeVisible();
  await expect(page.getByText('SDI IN')).toBeVisible();
  await expect(page.getByText('SDI OUT')).toBeVisible();
  await expect(page.getByText('V-0009 -> V-0012')).toBeVisible();
  await expect(page.getByText('V-0013 -> V-0016')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Device' })).toBeDisabled();

  await page.locator('#device-name').fill('E2E Detailed Source');
  await page.locator('#device-category').click();
  await page.getByRole('option', { name: 'Audio' }).click();
  await expect(page.getByText('AUDIO IN')).toBeVisible();
  await expect(page.getByText('AUDIO OUT')).toBeVisible();
  await expect(page.getByText('A-0001 -> A-0004')).toBeVisible();
  await expect(page.getByText('A-0005 -> A-0008')).toBeVisible();

  await page.getByRole('button', { name: 'Add Port Group' }).click();
  await expect(page.getByText('A-0009 -> A-0009')).toBeVisible();
  await page.getByLabel('Remove PORTS').click();
  await expect(page.getByText('A-0009 -> A-0009')).not.toBeVisible();

  await page.getByRole('button', { name: 'Create Device' }).click();
  await expect(page.getByRole('button', { name: /E2E Detailed Source/ })).toBeVisible();

  const exported = await exportProject(page);
  const device = exported.devices.find((item: any) => item.name === 'E2E Detailed Source');

  expect(device).toBeTruthy();
  expect(device.code).toBe('E2E-DETAILED-SOURCE');
  const devicePortGroups = exported.portGroups.filter((group: any) => group.deviceId === device.id);
  expect(devicePortGroups).toEqual([
    expect.objectContaining({
      name: 'AUDIO IN',
      connectorTypeId: 'connector-xlr',
      firstCableNumber: 1,
      lastCableNumber: 4,
      createPlannedCables: true,
    }),
    expect.objectContaining({
      name: 'AUDIO OUT',
      connectorTypeId: 'connector-xlr',
      firstCableNumber: 5,
      lastCableNumber: 8,
      createPlannedCables: true,
    }),
  ]);
  expect(exported.ports.filter((port: any) => port.deviceId === device.id)).toHaveLength(8);
  expect(exported.cables.filter((cable: any) => cable.prefix === 'A')).toHaveLength(8);
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
  const exported = await exportProject(page);

  expect(exported.schemaVersion).toBe('0.2.8.6');
  await importProject(page, exported.path);
  await expectProject(page, 'Demo Studio');
});

test('handles storage failure and recovers from valid stored data', async ({ browser }) => {
  const blockedPage = await browser.newPage();
  watchPageErrors(blockedPage);
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
  expect(pageErrors.get(blockedPage) ?? []).toEqual([]);
  await blockedPage.close();

  const page = await browser.newPage();
  watchPageErrors(page);
  await page.addInitScript(
    (sample) => {
      window.localStorage.setItem('studiowire.io.project.current', '{');
      window.localStorage.setItem('studiowire.io.project.v0.2.7', sample);
    },
    readFileSync(currentSamplePath, 'utf8').replace('0.2.8.6', '0.2.7.1'),
  );
  await page.goto('/');
  await expectProject(page, 'Demo Studio');
  expect(pageErrors.get(page) ?? []).toEqual([]);
  await page.close();
});

async function configureSettings(page: Page) {
  await page.getByLabel('Project actions').click();
  await page.getByText('Project Settings').click();
  await page.getByRole('tab', { name: 'Connectors' }).click();
  await page.getByPlaceholder('New connector').fill('E2E Connector');
  await page.getByRole('button', { name: 'Add Connector' }).click();
  await expect(page.locator('input[value="E2E Connector"]')).toBeVisible();
}

async function createLocation(page: Page, name: string) {
  await page.getByText('Create location or device').click({ button: 'right' });
  await page.getByText('Add Location').click();
  await page.locator('#location-name').fill(name);
  await page.locator('#location-type').fill('test_room');
  await page.getByRole('button', { name: 'Add Location' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

async function createRack(page: Page, locationName: string, rackName: string) {
  await locationButton(page, locationName).click({ button: 'right' });
  await page.getByText('Add Rack').click();
  await page.locator('#rack-name').fill(rackName);
  await page.getByRole('button', { name: 'Add Rack' }).click();
  await expect(page.getByRole('button', { name: new RegExp(`${rackName} 42 RU`) })).toBeVisible();
}

async function createDevice(page: Page, locationName: string, deviceName: string) {
  await locationButton(page, locationName).click({ button: 'right' });
  await page.getByText('Add Device').click();
  await page.locator('#device-name').fill(deviceName);
  await page.getByRole('button', { name: 'Create Device' }).click();
  await expect(page.getByRole('button', { name: new RegExp(deviceName) })).toBeVisible();
}

async function createTerminalBlock(page: Page, locationName: string, tbName: string, bottomRu: number) {
  await locationButton(page, locationName).click({ button: 'right' });
  await page.getByText('Add TB').click();
  await page.locator('#tb-name').fill(tbName);
  await page.locator('#tb-count').fill('2');
  await page.locator('#tb-bottom-ru').fill(String(bottomRu));
  await page.getByRole('button', { name: 'Create TB' }).click();
  await expect(page.getByRole('button', { name: new RegExp(tbName) })).toBeVisible();
}

async function connectPorts(page: Page, sourceNodeName: string, fromLabel: string, toLabel: string) {
  await page.getByRole('button', { name: new RegExp(sourceNodeName) }).click();
  await page.getByLabel(`Connect ${fromLabel}`).click();
  await page.getByLabel('Search ports').fill(toLabel);
  await page.getByText(toLabel).first().click();
  await expect(
    page.getByText(new RegExp(`connected ${escapeRegExp(fromLabel)} to ${escapeRegExp(toLabel)}`)),
  ).toBeVisible();
}

async function clearConnection(page: Page, sourceNodeName: string, fromLabel: string) {
  await page.getByRole('button', { name: new RegExp(sourceNodeName) }).click();
  await page.getByLabel(`Connect ${fromLabel}`).click();
  await page.getByText('Clear connection').click();
  await expect(page.getByText(`Connection cleared for ${fromLabel}`)).toBeVisible();
}

async function validateProject(page: Page) {
  await page.getByLabel('Project actions').click();
  await page.getByText('Validate').click();
  await expect(page.getByText('Validation passed')).toBeVisible();
}

async function createNewProject(page: Page) {
  await page.getByLabel('Project actions').click();
  await page.getByText('New Project').click();
}

async function exportProject(page: Page): Promise<Record<string, any> & { path: string }> {
  const downloadPromise = page.waitForEvent('download');

  await page.getByLabel('Project actions').click();
  await page.getByText('Export JSON').click();

  const download = await downloadPromise;
  const path = await download.path();

  expect(path).toBeTruthy();

  return {
    ...JSON.parse(readFileSync(path ?? '', 'utf8')),
    path: path ?? '',
  };
}

function normalizeExportedDomainData(project: Record<string, any>) {
  const { path: _path, ...domainData } = project;

  delete domainData.project.updatedAt;
  domainData.changeLog = domainData.changeLog.filter(
    (entry: any) => !entry.message.startsWith('Project imported from JSON'),
  );

  return domainData;
}

function locationButton(page: Page, locationName: string) {
  return page.getByRole('button', { name: new RegExp(`^${escapeRegExp(locationName)} \\d+$`) }).first();
}

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

function watchPageErrors(page: Page) {
  const errors: string[] = [];

  pageErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
