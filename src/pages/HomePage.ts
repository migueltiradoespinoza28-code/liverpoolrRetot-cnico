import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { selectors } from '../core/selectors';
import { env } from '../../config/env';

export class HomePage extends BasePage {
  async open() {
    await this.registerOverlayHandlers();
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await this.assertNotBlocked();
  }

  async search(term: string) {
    const input = this.page.locator(selectors.home.searchInput).first();
    await expect(input).toBeVisible({ timeout: env.resultsTimeoutMs });
    // El input existe desde el HTML del servidor, pero si React aún no hidrata, el Enter se pierde.
    // Reintentamos el envío hasta que la URL confirme la búsqueda (la home ya es /tienda/home,
    // por eso esperamos el parámetro ?s= y no solo la ruta). 'commit' y no 'load': el evento load
    // depende de decenas de scripts de terceros; de los resultados se encarga waitForStableResults.
    await expect(async () => {
      if (/[?&]s=/.test(this.page.url())) return;
      // Se teclea en vez de fill(): en WebKit fill() no actualiza el estado de React y el Enter busca vacío
      await input.fill('');
      await input.pressSequentially(term, { delay: 30 });
      // Si la hidratación re-renderizó el input a mitad del tecleo, el valor queda incompleto: reintenta
      await expect(input).toHaveValue(term, { timeout: 2_000 });
      await input.press('Enter');
      await this.page.waitForURL(/[?&]s=/, { timeout: 10_000, waitUntil: 'commit' });
    }).toPass({ timeout: env.searchTimeoutMs, intervals: [1_000, 2_000] });
    await this.assertNotBlocked();
  }
}
