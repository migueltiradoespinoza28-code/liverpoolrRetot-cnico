// Pruebas de la capa de datos sin navegador ni red: corren en milisegundos y prueban
// que la validación cruzada SÍ detecta diferencias (no solo el camino feliz).
import { test, expect } from '@playwright/test';
import { crossValidate } from '../../src/utils/crossValidator';
import { extractProducts } from '../../src/network/productExtractor';
import { parseEmbeddedJson } from '../../src/network/embeddedJson';
import { parsePrice } from '../../src/utils/text';

// Forma real (recortada) de un registro de /api/plp/search
const record = (productId: string, title: string, sale: number, list = sale) => ({
  productId, title, priceInfo: { salePrice: sale, listPrice: { price: list }, promoPrice: { price: sale } },
});
const apiBody = { plpResults: { records: [
  record('1', 'Consola PS5 de 825 GB edición bundle', 12499, 14999),
  record('2', 'Control inalámbrico DualSense blanco', 1399),
  record('3', 'Audífonos Pulse 3D', 2199),
], navigation: [{ name: 'Color', filter: [{ label: 'Blanco', count: 75 }] }] } };

test.describe('capa de datos @unit', () => {
  test('extrae productos de la respuesta de la API ignorando facets', () => {
    const products = extractProducts(apiBody);
    expect(products.map((p) => p.id)).toEqual(['1', '2', '3']);
    expect(products[0]).toMatchObject({ name: 'Consola PS5 de 825 GB edición bundle', price: 12499 });
    expect(products[0].prices).toEqual(expect.arrayContaining([12499, 14999]));
  });

  test('extrae productos del payload RSC embebido en el HTML (SSR de Next.js App Router)', () => {
    const rsc = `5:${JSON.stringify(apiBody)}\n6:["$","div",null,{}]\n`;
    const html = `<html><script>self.__next_f.push([1,${JSON.stringify(rsc)}])</script></html>`;
    expect(extractProducts(parseEmbeddedJson(html))).toHaveLength(3);
  });

  test('parsea precios como los muestra la UI', () => {
    expect(parsePrice('$14,699.00')).toBe(14699);
    expect(parsePrice('$314.30$449.00')).toBe(314.3); // con descuento: vigente + tachado
    expect(parsePrice('$179.00 - $399.00$262.00 - $519.00')).toBe(179); // rango por variantes
    expect(parsePrice('')).toBeNull();
  });

  test('detecta NOT_FOUND, NAME_MISMATCH y PRICE_MISMATCH', () => {
    const api = extractProducts(apiBody);
    const report = crossValidate([
      { name: 'Consola PS5 de 825 GB edición bundle', price: 12499 }, // coincide
      { name: 'Control inalambrico DualSense', price: 1399 },          // nombre distinto
      { name: 'Audífonos Pulse 3D', price: 1999 },                     // precio distinto
      { name: 'Xbox Series X', price: 11999 },                         // no existe
    ], api, 1, 0.6);

    const types = report.results.map((r) => r.discrepancies.map((d) => d.type));
    expect(types).toEqual([[], ['NAME_MISMATCH'], ['PRICE_MISMATCH'], ['NOT_FOUND']]);
    expect(report.matchedCount).toBe(3);
  });

  test('reconoce productos con rango de precios por variantes', () => {
    // Forma real de /api/plp/search: la UI muestra "$179.00 - $399.00"
    const [p] = extractProducts({ records: [
      { productId: '1063118321', title: 'Audífonos In-Ear Mdr-Ex14Ap alámbricos', priceInfo: {
        salePrice: 223.75, listPrice: { minPrice: 262, maxPrice: 519 }, promoPrice: { minPrice: 179, maxPrice: 399 } } },
      record('2', 'Audífonos In-Ear Tune 110', 179.1),
      record('3', 'Audífonos LS1P', 199),
    ] });
    const report = crossValidate([{ id: '1063118321', name: 'Audífonos In-Ear Mdr-Ex14Ap alámbricos', price: 179 }], [p], 1);
    expect(report.results[0].discrepancies).toEqual([]);
  });

  test('marca los productos patrocinados (la UI los inserta fuera del orden por precio)', () => {
    const products = extractProducts({ records: [
      { ...record('1', 'Consola fija xbox series x de 1 tb', 16999), featureFlags: { isSponsoredRecord: true } },
      { ...record('2', 'Funda control Xbox Series', 129), featureFlags: { isSponsoredRecord: false } },
      record('3', 'Sports Fc 25 para Xbox Series X', 305.5),
    ] });
    expect(products.map((p) => p.sponsored)).toEqual([true, false, false]);
  });

  test('empareja por ID cuando dos productos comparten nombre', () => {
    const api = extractProducts({ records: [
      record('10', 'Consola fija ps5 de 1 tb', 14699),
      record('11', 'Consola fija ps5 de 1 tb', 14999, 22726),
      record('12', 'Consola PS5 digital', 12999),
    ] });
    const byId = crossValidate([{ id: '11', name: 'Consola fija ps5 de 1 tb', price: 14999 }], api, 1);
    expect(byId.results[0].api?.id).toBe('11');
    expect(byId.results[0].discrepancies).toEqual([]);
    // Sin ID, el empate por nombre se resuelve por el precio más cercano
    const byName = crossValidate([{ name: 'Consola fija ps5 de 1 tb', price: 14999 }], api, 1);
    expect(byName.results[0].api?.id).toBe('11');
  });
});
