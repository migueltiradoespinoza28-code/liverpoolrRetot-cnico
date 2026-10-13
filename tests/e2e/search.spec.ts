import { test, expect, selectedScenarios } from '../fixtures';
import { crossValidate } from '../../src/utils/crossValidator';
import { printProducts, reportCrossValidation } from '../../src/utils/logger';
import { env } from '../../config/env';

for (const sc of selectedScenarios()) {
  test.describe(`Búsqueda: "${sc.term}"`, () => {
    test(`filtra, ordena y valida UI contra red [${sc.id}]`, async ({ home, results, interceptor }, testInfo) => {
      // ── Parte 1: flujo E2E ────────────────────────────────────────────
      await test.step('Navegar a Liverpool', () => home.open());
      await test.step(`Buscar "${sc.term}"`, async () => {
        await home.search(sc.term);
        await results.waitForStableResults();
      });
      if (sc.color) await test.step(`Filtrar por color "${sc.color}"`, () => results.filterByColor(sc.color!));
      if (sc.sort) await test.step(`Ordenar por "${sc.sort}"`, () => results.sortBy(sc.sort!));

      const uiProducts = await test.step('Extraer primeros resultados', () => results.getTopProducts(env.resultsToExtract));
      printProducts(`Top ${env.resultsToExtract} UI – ${sc.term}`, uiProducts);

      expect(uiProducts, 'Debe haber al menos un resultado').not.toHaveLength(0);
      expect(uiProducts.every((p) => p.name && p.price !== null), 'Todos los productos deben tener nombre y precio').toBe(true);

      if (sc.sort) {
        const prices = uiProducts.map((p) => p.price!);
        expect(prices, 'Los precios deben estar en orden ascendente').toEqual([...prices].sort((a, b) => a - b));
      }

      // ── Parte 2: validación cruzada contra la respuesta de red ────────
      await test.step('Validar UI contra la respuesta interceptada', async () => {
        const payload = interceptor.latest();
        expect(payload, 'No se interceptó ninguna respuesta con productos').toBeDefined();
        console.log(`Fuente de datos: ${payload!.source} → ${payload!.url} (${payload!.products.length} productos)`);
        printProducts('Primeros 5 en la respuesta de red', payload!.products.slice(0, 5));

        const report = crossValidate(uiProducts, payload!.products, env.priceTolerance);
        await reportCrossValidation(report, testInfo);

        expect(
          report.matchedCount,
          `Se esperaban al menos ${env.minMatches} coincidencias UI↔red`,
        ).toBeGreaterThanOrEqual(Math.min(env.minMatches, uiProducts.length));
      });
    });
  });
}
