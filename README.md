# Liverpool E2E — Búsqueda con validación UI ↔ Red

[![E2E Tests](https://github.com/migueltiradoespinoza28-code/liverpoolrRetot-cnico/actions/workflows/test.yml/badge.svg)](https://github.com/migueltiradoespinoza28-code/liverpoolrRetot-cnico/actions/workflows/test.yml)

Framework de automatización con **Playwright + TypeScript** que busca *"playstation 5"*, filtra por color **Blanco**, ordena por **menor precio**, extrae los 5 primeros productos y los **valida contra la respuesta de red** que consume el frontend.

Las decisiones de diseño están en [`TEST_STRATEGY.md`](./TEST_STRATEGY.md).

## Requisitos
- Node.js 20+

## Instalación
```bash
npm ci
npx playwright install chromium     # o: npx playwright install  (Chromium, Firefox y WebKit)
```

## Ejecución
| Comando | Qué hace |
|---|---|
| `npm test` | Unitarias de la capa de datos + flujo principal, **headless** (por defecto) |
| `npm run test:headed` | Mismo flujo con navegador visible (también `HEADED=1 npm test`; en PowerShell: `$env:HEADED=1; npm test`) |
| `npm run test:unit` | Solo extractor y validador cruzado, sin navegador (~1 s) |
| `npm run test:all-scenarios` | Data-driven: PS5, Xbox Series X, Nintendo Switch |
| `SEARCH_TERM="nintendo switch" npm test` | Cualquier término sin tocar código (`SEARCH_COLOR=Rojo` opcional) |
| `npm run test:cross-browser` | En paralelo en Chromium, Firefox y WebKit |
| `npm run test:bonus` | Accesibilidad (axe-core), rendimiento y regresión visual |
| `npm run report` | Abre el reporte HTML |

Parámetros configurables en [`config/env.ts`](./config/env.ts) vía variables de entorno: `RESULTS_TO_EXTRACT`, `MIN_MATCHES`, `PRICE_TOLERANCE`, `PERF_BUDGET_MS`, `TEST_TIMEOUT_MS`, `BASE_URL`, etc.

> **Regresión visual:** las líneas base dependen del sistema operativo (`*-win32.png`, `*-linux.png`). Para otro SO genera la suya con `npm run test:visual:update`.
>
> **Accesibilidad:** el sitio ya tiene violaciones críticas conocidas, registradas en `data/a11y-baseline.json`. Todas se reportan, pero el test solo falla si aparece una regla crítica **nueva**.

## Estructura
```
config/env.ts                 → toda la configuración (sin valores hardcodeados en tests)
data/search-scenarios.json    → escenarios data-driven
data/a11y-baseline.json       → violaciones de accesibilidad ya conocidas
src/core/selectors.ts         → selectores centralizados con alternativas
src/pages/                    → Page Objects (Home, SearchResults)
src/network/                  → interceptor de respuestas, parser de JSON embebido (RSC) y extractor
src/utils/crossValidator.ts   → comparación UI ↔ red y registro de discrepancias
tests/fixtures.ts             → inyección de dependencias de Playwright
tests/unit/                   → pruebas sin navegador de la validación cruzada (detecta discrepancias)
tests/e2e/search.spec.ts      → flujo requerido (Partes 1 y 2)
tests/bonus/quality.spec.ts   → a11y, rendimiento, visual
.github/workflows/test.yml    → CI: instala, ejecuta headless, publica reporte
```

## Cómo funciona la validación cruzada
1. El interceptor se activa antes de navegar y solo observa las respuestas.
2. Detecta productos en el JSON de `/api/plp/search` (filtros y orden) y en el payload RSC de Next.js embebido en el HTML (carga inicial SSR).
3. Después de filtrar u ordenar espera la nueva respuesta, para comparar contra el estado final.
4. Empareja cada producto de la UI por `productId` (sale del `data-testid` de la tarjeta). Si no hay ID, usa el nombre normalizado. Después valida el precio. Hay productos distintos con el mismo nombre, por eso el ID va primero.
5. Exige al menos 3 de 5 coincidencias y registra `NOT_FOUND`, `NAME_MISMATCH` y `PRICE_MISMATCH` en consola y en `cross-validation.json` dentro del reporte.

## Nota sobre el WAF (Akamai)
Liverpool bloquea con *Access Denied* al `chromium-headless-shell` que Playwright usa por defecto en headless. El proyecto `chromium` usa `channel: 'chromium'`, el modo *new headless*: el mismo navegador completo, sin ventana. No se falsifica nada más. Si aun así aparece un bloqueo, el test falla con un mensaje explícito, no con un timeout de selector (ver `TEST_STRATEGY.md`).

## Reportes y evidencias
- Reporte HTML de Playwright (`playwright-report/`), publicado como artefacto en cada ejecución de CI.
- Screenshot, video y trace **automáticos en fallos**, configurados en `playwright.config.ts` (no en los tests).
