// Extrae el JSON que Next.js embebe en el HTML renderizado en servidor:
// - Pages Router: <script id="__NEXT_DATA__">{...}</script>
// - App Router:   self.__next_f.push([1,"<payload RSC>"]), donde cada línea del payload es "id:JSON"
const NEXT_DATA_RE = /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;
const RSC_CHUNK_RE = /self\.__next_f\.push\((\[[\s\S]*?\])\)\s*<\/script>/g;
const RSC_ROW_RE = /^[0-9a-f]+:([[{].*)$/;

const tryParse = (s: string): unknown => {
  try { return JSON.parse(s); } catch { return undefined; }
};

export function parseEmbeddedJson(html: string): unknown[] {
  const roots: unknown[] = [];

  const nextData = html.match(NEXT_DATA_RE);
  if (nextData) roots.push(tryParse(nextData[1]));

  let flight = '';
  for (const m of html.matchAll(RSC_CHUNK_RE)) {
    const chunk = tryParse(m[1]);
    if (Array.isArray(chunk) && typeof chunk[1] === 'string') flight += chunk[1];
  }
  for (const line of flight.split('\n')) {
    const row = line.match(RSC_ROW_RE);
    if (row) roots.push(tryParse(row[1]));
  }

  return roots.filter((r) => r !== undefined);
}
