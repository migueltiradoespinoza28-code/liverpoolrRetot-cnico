import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

export default defineConfig({
  testDir: './tests',
  // Límite total por test. WebKit/Firefox en Windows tardan 3-4x más que Chromium en esta página
  timeout: env.testTimeoutMs,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: env.isCI,
  // Reintentos solo en CI: un sitio de terceros en producción tiene ruido de red.
  // Un test que pasa en reintento queda marcado como "flaky" en el reporte (no se oculta).
  retries: env.isCI ? 2 : 0,
  workers: env.isCI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: env.baseURL,
    headless: !env.headed, // headless por defecto; --headed o HEADED=1 para verlo
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    // Evidencia automática configurada en el framework, no en los tests:
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // Lógica pura (extractor, validador): no abre navegador, corre una sola vez
    { name: 'unit', testMatch: /unit[\\/].*\.spec\.ts/ },
    {
      name: 'chromium',
      testIgnore: /unit[\\/]/,
      // channel 'chromium' = "new headless" (el navegador completo). El headless-shell por defecto
      // tiene otra huella y el WAF de Liverpool (Akamai) responde "Access Denied".
      use: { ...devices['Desktop Chrome'], channel: 'chromium', viewport: { width: 1440, height: 900 } },
    },
    { name: 'firefox', testIgnore: /unit[\\/]/, use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'webkit', testIgnore: /unit[\\/]/, use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
  ],
});
