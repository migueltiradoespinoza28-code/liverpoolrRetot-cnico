import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { selectors } from '../core/selectors';
import { Product } from '../core/types';
import { escapeRegex, parsePrice } from '../utils/text';
import { CapturedPayload, SearchResponseInterceptor } from '../network/SearchResponseInterceptor';
import { env } from '../../config/env';

export class SearchResultsPage extends BasePage {
  constructor(page: BasePage['page'], private readonly interceptor: SearchResponseInterceptor) {
    super(page);
  }

  get cards(): Locator {
    return this.page.locator(selectors.results.productCard);
  }

  // Resultados orgánicos: sin los patrocinados, que la UI coloca fuera del orden por precio
  get organicCards(): Locator {
    return this.cards.filter({ hasNotText: selectors.results.sponsoredLabel });
  }

  // Despues de filtrar/ordenar la grilla se re-renderiza; espero a que deje de cambiar.
  // Si se conoce la respuesta de red que provocó el cambio, además espero a que la UI la refleje:
  // sin esto, a veces se lee la grilla anterior porque React pinta un instante después de la respuesta.
  async waitForStableResults(payload?: CapturedPayload) {
    await expect(this.cards.first()).toBeVisible({ timeout: env.resultsTimeoutMs });
    const expectedFirstId = payload?.products.find((p) => !p.sponsored)?.id;
    if (expectedFirstId) {
      await expect
        .poll(async () => (await this.organicCards.first().getAttribute('data-testid'))?.match(selectors.results.productIdFromTestId)?.[1], {
          timeout: env.resultsTimeoutMs,
        })
        .toBe(expectedFirstId)
        // Si no coincide (p. ej. un patrocinado solo en la UI) no se falla aquí: la validación cruzada lo reporta
        .catch(() => console.warn(`La UI no mostró primero el producto ${expectedFirstId} de la respuesta de red`));
    }
    let previous = '';
    await expect
      .poll(
        async () => {
          const current = (await this.cards.first().innerText().catch(() => '')) + (await this.cards.count());
          const stable = current !== '' && current === previous;
          previous = current;
          return stable;
        },
        { timeout: env.resultsTimeoutMs, intervals: [500, 750, 1_000] },
      )
      .toBe(true);
  }

  async filterByColor(color: string) {
    const rx = new RegExp(`^\\s*${escapeRegex(color)}\\b`, 'i');
    const option = this.page
      .locator(selectors.results.filterOptionLabel)
      .filter({ hasText: rx })
      .or(this.page.getByRole('checkbox', { name: rx }))
      .first();

    // El facet "Color" puede venir colapsado, o re-renderizarse mientras se abre (un clic a destiempo
    // lo vuelve a cerrar). Se alterna y se re-verifica hasta que la opción sea visible.
    const facetHeader = this.page.getByRole('button', { name: /^\s*color\s*$/i })
      .or(this.page.getByText(/^\s*color\s*$/i))
      .first();
    await expect(async () => {
      if (await option.isVisible()) return;
      await facetHeader.click();
      await expect(option).toBeVisible({ timeout: 3_000 });
    }, `No se encontró la opción de color "${color}"`).toPass({ timeout: env.resultsTimeoutMs, intervals: [500, 1_000] });
    await this.waitForStableResults(await this.interceptor.captureDuring(() => option.click(), env.resultsTimeoutMs));
  }

  async sortBy(label: string) {
    const nativeSelect = this.page.locator('select').filter({ has: this.page.locator('option', { hasText: label }) });
    let payload: CapturedPayload | undefined;
    if (await nativeSelect.count()) {
      payload = await this.interceptor.captureDuring(() => nativeSelect.first().selectOption({ label }), env.resultsTimeoutMs);
    } else {
      const option = this.page.getByRole('option', { name: label })
        .or(this.page.getByRole('button', { name: label }))
        .or(this.page.getByText(label, { exact: true }))
        .first();
      // Igual que el facet de color: si la página re-renderiza, el clic no abre el menú. Se reintenta.
      await expect(async () => {
        if (await option.isVisible()) return;
        await this.page.getByRole('button', { name: /ordenar por/i }).first().click();
        await expect(option).toBeVisible({ timeout: 3_000 });
      }, `No se encontró la opción de orden "${label}"`).toPass({ timeout: env.resultsTimeoutMs, intervals: [500, 1_000] });
      payload = await this.interceptor.captureDuring(() => option.click(), env.resultsTimeoutMs);
    }
    await this.waitForStableResults(payload);
  }

  async getTopProducts(n: number): Promise<Product[]> {
    const sponsored = (await this.cards.count()) - (await this.organicCards.count());
    if (sponsored) console.log(`Se omiten ${sponsored} productos patrocinados (no son resultados orgánicos)`);
    const count = Math.min(await this.organicCards.count(), n);
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.organicCards.nth(i);
      const name = (await card.locator(selectors.results.productName).first().innerText()).trim();
      const id = (await card.getAttribute('data-testid'))?.match(selectors.results.productIdFromTestId)?.[1];
      const priceText = await card.locator(selectors.results.productPrice).first().textContent();
      products.push({ name, price: parsePrice(priceText), id });
    }
    return products;
  }
}
