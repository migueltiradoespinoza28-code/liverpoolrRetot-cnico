import AxeBuilder from '@axe-core/playwright';
import { test, expect, selectedScenarios } from '../fixtures';
import { selectors } from '../../src/core/selectors';
import { env } from '../../config/env';
import a11yBaseline from '../../data/a11y-baseline.json';

const sc = selectedScenarios()[0];

test.describe('Calidad de la página de resultados @bonus', () => {
  test.beforeEach(async ({ home, results }) => {
    await home.open();
    await home.search(sc.term);
    await results.waitForStableResults();
  });

  test('accesibilidad con axe-core (informativo) @a11y', async ({ page }, info) => {
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    await info.attach('axe-violations.json', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
    console.table(violations.map((v) => ({ id: v.id, impacto: v.impact, nodos: v.nodes.length })));
    // No controlamos el código de Liverpool: reportamos todo, y solo bloqueamos si aparecen críticas nuevas.
    const critical = violations.filter((v) => v.impact === 'critical').map((v) => v.id);
    const newCritical = critical.filter((id) => !a11yBaseline.knownCritical.includes(id));
    info.annotations.push({ type: 'a11y', description: `${violations.length} violaciones; críticas: ${critical.join(', ') || 'ninguna'}` });
    expect(newCritical, 'Violaciones críticas nuevas (fuera de data/a11y-baseline.json)').toEqual([]);
  });

  test('rendimiento: resultados en menos del presupuesto @perf', async ({ page }) => {
    const start = Date.now();
    await page.goto(`/tienda?s=${encodeURIComponent(sc.term)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(selectors.results.productCard).first()).toBeVisible({ timeout: env.perfBudgetMs });
    const elapsed = Date.now() - start;
    const lcp = await page.evaluate(() => new Promise<number>((resolve) => {
      new PerformanceObserver((l) => resolve(l.getEntries().at(-1)?.startTime ?? -1))
        .observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => resolve(-1), 2_000);
    }));
    console.log(`Resultados visibles en ${elapsed} ms | LCP ${Math.round(lcp)} ms`);
    expect(elapsed).toBeLessThan(env.perfBudgetMs);
  });

  test('regresión visual de la página de resultados @visual', async ({ page }) => {
    // Se enmascara el contenido dinámico (productos, precios, banners) y se compara el layout.
    await expect(page).toHaveScreenshot('search-results.png', {
      mask: [page.locator(selectors.results.productCard), page.locator('img, video, iframe')],
      maxDiffPixelRatio: 0.03,
      animations: 'disabled',
    });
  });
});
