import { Product } from '../core/types';

// No dependo de rutas fijas del JSON: busco arreglos donde la mayoria de items tenga nombre y precio.
// Asi funciona igual con la API (/api/plp/search) o con el JSON embebido en el HTML del SSR.
const NAME_KEYS = ['productDisplayName', 'displayName', 'productName', 'title', 'name'];
const PRICE_KEYS = [
  'promoPrice', 'salePrice', 'sortPrice', 'listPrice', 'price', 'minPrice', 'maxPrice',
  'minimumPromoPrice', 'minimumListPrice', 'maximumPromoPrice', 'maximumListPrice',
];
const ID_KEYS = ['productId', 'skuId', 'id'];
// Marca de anuncio patrocinado (en Liverpool vive en featureFlags.isSponsoredRecord)
const isSponsored = (o: Record<string, Json>): boolean =>
  Object.entries(o).some(([k, v]) => (/sponsored/i.test(k) && v === true) || (isObj(v) && isSponsored(v)));

type Json = unknown;
const isObj = (v: Json): v is Record<string, Json> => !!v && typeof v === 'object' && !Array.isArray(v);

const toNumber = (v: Json): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\s*\$?\s*[\d,]+(\.\d+)?\s*$/.test(v)) return Number(v.replace(/[$,\s]/g, ''));
  return null;
};

const findName = (o: Record<string, Json>, depth = 0): string | undefined => {
  for (const k of NAME_KEYS) {
    const v = Array.isArray(o[k]) ? (o[k] as Json[])[0] : o[k];
    if (typeof v === 'string' && v.trim().length > 3) return v.trim();
  }
  if (depth >= 2) return undefined;
  for (const v of Object.values(o)) if (isObj(v)) { const n = findName(v, depth + 1); if (n) return n; }
  return undefined;
};

const collectPrices = (o: Json, depth = 0, acc: number[] = []): number[] => {
  if (depth > 4) return acc;
  if (Array.isArray(o)) { o.slice(0, 5).forEach((x) => collectPrices(x, depth + 1, acc)); return acc; }
  if (!isObj(o)) return acc;
  for (const [k, v] of Object.entries(o)) {
    const key = PRICE_KEYS.find((p) => p.toLowerCase() === k.toLowerCase());
    const val = Array.isArray(v) ? toNumber(v[0]) : toNumber(v);
    if (key && val !== null && val > 0) acc.push(val);
    else if (typeof v === 'object') collectPrices(v, depth + 1, acc);
  }
  return acc;
};

const toProduct = (o: Json): Product | null => {
  if (!isObj(o)) return null;
  const name = findName(o);
  const prices = [...new Set(collectPrices(o))];
  if (!name || prices.length === 0) return null;
  const idKey = ID_KEYS.find((k) => typeof o[k] === 'string' || typeof o[k] === 'number');
  return { name, price: Math.min(...prices), prices, id: idKey ? String(o[idKey]) : undefined, sponsored: isSponsored(o) };
};

export function extractProducts(root: Json): Product[] {
  let best: Product[] = [];
  const stack: Json[] = [root];
  let visited = 0;
  while (stack.length && visited++ < 50_000) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      if (node.length >= 3) {
        const products = node.map(toProduct).filter((p): p is Product => p !== null);
        // Exigimos que la mayoría de elementos sean productos para evitar falsos positivos (menús, banners).
        if (products.length >= 3 && products.length / node.length >= 0.6 && products.length > best.length) best = products;
      }
      node.forEach((n) => stack.push(n));
    } else if (isObj(node)) {
      Object.values(node).forEach((v) => typeof v === 'object' && stack.push(v));
    }
  }
  return best;
}
