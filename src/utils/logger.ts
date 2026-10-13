import { TestInfo } from '@playwright/test';
import { Product } from '../core/types';
import { CrossValidationReport } from './crossValidator';

const fmt = (n: number | null) => (n === null ? 'N/D' : n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }));

export function printProducts(title: string, products: Product[]) {
  console.log(`\n=== ${title} ===`);
  console.table(products.map((p, i) => ({ '#': i + 1, Nombre: p.name, Precio: fmt(p.price) })));
}

export async function reportCrossValidation(report: CrossValidationReport, info: TestInfo) {
  console.log(`\n=== Validación cruzada UI ↔ Red: ${report.matchedCount}/${report.total} coincidencias ===`);
  for (const r of report.results) {
    for (const d of r.discrepancies) console.warn(`  [${d.type}] ${d.detail}`);
  }
  // Queda adjunto en el reporte HTML para revisión posterior.
  await info.attach('cross-validation.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
}
