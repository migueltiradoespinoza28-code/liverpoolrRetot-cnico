import { Product } from '../core/types';
import { normalizeName, tokenSimilarity } from './text';

export type DiscrepancyType = 'NOT_FOUND' | 'NAME_MISMATCH' | 'PRICE_MISMATCH';

export interface MatchResult {
  ui: Product;
  api?: Product;
  matched: boolean;
  nameSimilarity: number;
  discrepancies: { type: DiscrepancyType; detail: string }[];
}

export interface CrossValidationReport {
  matchedCount: number;
  total: number;
  results: MatchResult[];
}

export function crossValidate(ui: Product[], api: Product[], priceTolerance: number, nameThreshold = 0.7): CrossValidationReport {
  const similarity = (a: Product, u: Product) =>
    normalizeName(a.name) === normalizeName(u.name) ? 1 : tokenSimilarity(a.name, u.name);

  const results: MatchResult[] = ui.map((u) => {
    // 1) Por ID: hay productos distintos con el mismo nombre (p. ej. dos "Consola fija ps5 de 1 tb")
    let best = u.id ? api.find((a) => a.id === u.id) : undefined;
    let bestScore = best ? similarity(best, u) : 0;
    // 2) Sin ID, por nombre; en empate gana el de precio más cercano
    if (!best) {
      const gap = (a: Product) => Math.abs((a.price ?? Infinity) - (u.price ?? 0));
      for (const a of api) {
        const score = similarity(a, u);
        if (score > bestScore || (score === bestScore && best && gap(a) < gap(best))) { bestScore = score; best = a; }
      }
    }

    const discrepancies: MatchResult['discrepancies'] = [];
    // Si el ID coincide es el mismo producto aunque el nombre difiera (eso se reporta como NAME_MISMATCH)
    const matched = !!best && ((!!u.id && best.id === u.id) || bestScore >= nameThreshold);

    if (!matched) {
      discrepancies.push({ type: 'NOT_FOUND', detail: `"${u.name}" no aparece en la respuesta (mejor similitud ${bestScore.toFixed(2)})` });
    } else {
      if (bestScore < 1) discrepancies.push({ type: 'NAME_MISMATCH', detail: `UI="${u.name}" vs API="${best!.name}"` });
      const apiPrices = best!.prices ?? (best!.price !== null ? [best!.price] : []);
      const priceOk = u.price !== null && apiPrices.some((p) => Math.abs(p - u.price!) <= priceTolerance);
      if (!priceOk) discrepancies.push({ type: 'PRICE_MISMATCH', detail: `UI=${u.price} vs API=[${apiPrices.join(', ')}] para "${u.name}"` });
    }
    return { ui: u, api: matched ? best : undefined, matched, nameSimilarity: bestScore, discrepancies };
  });

  return { matchedCount: results.filter((r) => r.matched).length, total: ui.length, results };
}
