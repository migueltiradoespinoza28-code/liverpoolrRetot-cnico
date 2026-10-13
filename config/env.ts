// Todo lo configurable se puede sobreescribir con variables de entorno
const num = (v: string | undefined, d: number) => (v !== undefined && v !== '' ? Number(v) : d);

export const env = {
  baseURL: process.env.BASE_URL ?? 'https://www.liverpool.com.mx',
  isCI: !!process.env.CI,
  headed: process.env.HEADED === '1',
  resultsToExtract: num(process.env.RESULTS_TO_EXTRACT, 5),
  minMatches: num(process.env.MIN_MATCHES, 3),
  priceTolerance: num(process.env.PRICE_TOLERANCE, 1),
  testTimeoutMs: num(process.env.TEST_TIMEOUT_MS, 180_000),
  resultsTimeoutMs: num(process.env.RESULTS_TIMEOUT_MS, 30_000),
  searchTimeoutMs: num(process.env.SEARCH_TIMEOUT_MS, 60_000), // reintentos de envío de la búsqueda
  perfBudgetMs: num(process.env.PERF_BUDGET_MS, 10_000),
  allScenarios: process.env.ALL_SCENARIOS === '1',
  adHocTerm: process.env.SEARCH_TERM,
  adHocColor: process.env.SEARCH_COLOR,
  // Respuestas de red que contienen los resultados de búsqueda (API de PLP y el HTML SSR de /tienda)
  searchResponseUrl: new RegExp(process.env.SEARCH_RESPONSE_URL ?? '/api/plp/search|/tienda'),
} as const;
