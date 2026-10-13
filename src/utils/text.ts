export const normalizeName = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/(\d+)\s+([a-z]{1,3})\b/g, '$1$2') // "1 tb" -> "1tb", "825 gb" -> "825gb"
    .trim();

export const tokenSimilarity = (a: string, b: string): number => {
  const A = new Set(normalizeName(a).split(' ').filter(Boolean));
  const B = new Set(normalizeName(b).split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  const inter = [...A].filter((t) => B.has(t)).length;
  return inter / new Set([...A, ...B]).size;
};

// Toma el PRIMER monto del texto: es el precio vigente en los tres formatos de tarjeta
// ("$550.00", "$314.30$449.00" con descuento, "$179.00 - $399.00$262.00 - $519.00" por rango).
// Los centavos van en un span con un "." invisible, que textContent sí incluye.
export const parsePrice = (text: string | null | undefined): number | null => {
  const m = (text ?? '').match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
