import { test, expect } from '@playwright/test';

/**
 * Product-level browser E2E driven through scripts/launch.sh.
 *
 * Requires the stack already running via `RUN_E2E=1 ./scripts/launch.sh`
 * (backend in mock mode on :8000, built web app previewed on :5173).
 *
 * Exercises the full user journey against real API responses:
 * home → start research → progress → completed session (report, findings,
 * sources) → single-source summarize modal → workspace page → filters.
 */

const OBJECTIVE =
  'I want to build a privacy-focused search engine using Rust. Find relevant research papers, existing search projects, indexing libraries, and technologies.';

// The app loads Google Fonts from the network. Abort those requests so the
// E2E is hermetic and document "load" is not blocked by external resources.
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
});

test('product flow: research → results → summary → workspace', async ({ page }) => {
  // ── 1. Home loads ────────────────────────────────────────
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#research-objective')).toBeVisible();
  await expect(page.getByText('Recent research')).toBeVisible();

  // ── 2. Start a research session ──────────────────────────
  await page.locator('#research-objective').fill(OBJECTIVE);
  await page.getByRole('button', { name: 'Begin research' }).click();
  // The SPA navigates via the history API; wait on the committed URL rather
  // than the network-dependent "load" event. Session ids are hex, so match
  // the pathname prefix instead of assuming numeric ids.
  await page.waitForURL((url) => url.pathname.startsWith('/research/'), { waitUntil: 'commit' });

  // The progress screen may render too briefly to assert reliably in mock
  // mode, so completion is the real signal: the Sources section appears.
  const sourcesSection = page.locator('section#sources');
  await sourcesSection.waitFor({ state: 'visible', timeout: 150_000 });

  // ── 3. Completed session renders real data ───────────────
  await expect(page.locator('section#report')).toBeVisible();
  await expect(page.locator('section#report').locator('h1, h2, h3').first()).toBeVisible();

  const sourceCards = sourcesSection.locator('article');
  const sourceCount = await sourceCards.count();
  expect(sourceCount).toBeGreaterThan(0);
  expect(await sourcesSection.locator('article a[href^="http"]').count()).toBeGreaterThan(0);

  // Findings + gaps each render their section even if empty
  await expect(page.locator('section#findings')).toBeVisible();
  await expect(page.locator('section#questions')).toBeVisible();

  // ── 4. Summarize a single source in the modal ────────────
  await page.getByRole('button', { name: 'Summarize this source' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Focused summary')).toBeVisible();
  await expect(dialog.getByText('Summary', { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(dialog.getByText(/captcha/i)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // ── 5. Workspace page with filters ───────────────────────
  await page.getByRole('link', { name: /Open workspace/ }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole('heading', { name: 'Workspace' })).toBeVisible();

  const workspaceCards = page.locator('article');
  await workspaceCards.first().waitFor({ state: 'visible', timeout: 30_000 });
  expect(await workspaceCards.count()).toBe(sourceCount);

  // Star the first source, then verify the Starred filter narrows correctly.
  await page.getByRole('button', { name: 'Star source' }).first().click();
  await expect(page.getByRole('button', { name: 'Remove star' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Starred' }).click();
  const starredCount = await workspaceCards.count();
  expect(starredCount).toBeGreaterThan(0);
  expect(starredCount).toBeLessThanOrEqual(sourceCount);
});