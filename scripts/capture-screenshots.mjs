// Capture app screenshots for README documentation
// Usage: node scripts/capture-screenshots.mjs

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173';
const VIEWPORT = { width: 1440, height: 900 };

async function dismissOnboarding(page) {
  // Set localStorage flag to skip onboarding before navigating
  await page.evaluate(() => {
    localStorage.setItem('studypath-onboarding-seen', 'true');
  });
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('studypath-theme', JSON.stringify({ state: { theme: t }, version: 0 }));
  }, theme);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });

  const page = await ctx.newPage();

  // Pre-set localStorage flags before any navigation
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  await setTheme(page, 'dark');

  // --- DARK MODE SCREENSHOTS ---

  // 1. Overview
  console.log('Capturing: overview-dark');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/overview-dark.png` });

  // 2. Studies page
  console.log('Capturing: studies-dark');
  const studiesBtn = page.locator('nav button, nav a, button').filter({ hasText: 'Studies' }).first();
  await studiesBtn.click({ timeout: 5000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/studies-dark.png` });

  // 3. Routine page
  console.log('Capturing: routine-dark');
  const routineBtn = page.locator('nav button, nav a, button').filter({ hasText: 'Routine' }).first();
  await routineBtn.click({ timeout: 5000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/routine-dark.png` });

  // 4. Go to settings via clicking gear icon
  console.log('Capturing: settings-dark');
  const gearBtn = page.locator('button[aria-label]').filter({ hasText: '' }).nth(1);
  // Use the nav approach instead - look for settings icon button
  const allButtons = await page.locator('header button, nav button').all();
  let settingsClicked = false;
  for (const btn of allButtons) {
    const label = await btn.getAttribute('aria-label').catch(() => '');
    const title = await btn.getAttribute('title').catch(() => '');
    if ((label && label.toLowerCase().includes('sett')) || (title && title.toLowerCase().includes('sett')) ||
        (label && label.toLowerCase().includes('config')) || (title && title.toLowerCase().includes('config'))) {
      await btn.click();
      settingsClicked = true;
      break;
    }
  }
  if (!settingsClicked) {
    // Try to find gear-like icon button by SVG content
    await page.evaluate(() => {
      // Find the settings gear button in the topbar
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.querySelector('[data-icon="Gear"], [data-icon="GearSix"]') ||
            b.querySelector('svg path[d*="M12.25"]') ||
            b.getAttribute('aria-label')?.includes('onfig')) {
          b.click();
          return;
        }
      }
    });
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/settings-dark.png` });

  // 5. Note panel
  console.log('Capturing: note-panel-dark');
  // Navigate to home first
  const homeBtn = page.locator('nav button, nav a, button').filter({ hasText: 'Home' }).first();
  await homeBtn.click({ timeout: 5000 });
  await page.waitForTimeout(1500);
  // Click on a note
  const noteLink = page.locator('text=Event Loop Deep Dive').first();
  if (await noteLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await noteLink.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/note-panel-dark.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // --- LIGHT MODE ---

  console.log('\nSwitching to light mode...');
  await setTheme(page, 'light');

  const ctxLight = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });
  const pageLight = await ctxLight.newPage();
  await pageLight.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(pageLight);
  await setTheme(pageLight, 'light');

  // 6. Overview light
  console.log('Capturing: overview-light');
  await pageLight.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await pageLight.waitForTimeout(1500);
  await pageLight.screenshot({ path: `${OUT}/overview-light.png` });

  // 7. Studies light
  console.log('Capturing: studies-light');
  const studiesBtnL = pageLight.locator('nav button, nav a, button').filter({ hasText: 'Studies' }).first();
  await studiesBtnL.click({ timeout: 5000 });
  await pageLight.waitForTimeout(2000);
  await pageLight.screenshot({ path: `${OUT}/studies-light.png` });

  // 8. Routine light
  console.log('Capturing: routine-light');
  const routineBtnL = pageLight.locator('nav button, nav a, button').filter({ hasText: 'Routine' }).first();
  await routineBtnL.click({ timeout: 5000 });
  await pageLight.waitForTimeout(2000);
  await pageLight.screenshot({ path: `${OUT}/routine-light.png` });

  // 9. Note panel light
  console.log('Capturing: note-panel-light');
  const homeBtnL = pageLight.locator('nav button, nav a, button').filter({ hasText: 'Home' }).first();
  await homeBtnL.click({ timeout: 5000 });
  await pageLight.waitForTimeout(1500);
  const noteLinkL = pageLight.locator('text=Event Loop Deep Dive').first();
  if (await noteLinkL.isVisible({ timeout: 3000 }).catch(() => false)) {
    await noteLinkL.click();
    await pageLight.waitForTimeout(2000);
    await pageLight.screenshot({ path: `${OUT}/note-panel-light.png` });
  }

  await browser.close();
  console.log(`\nDone! Screenshots saved to ${OUT}`);
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err.message);
  process.exit(1);
});
