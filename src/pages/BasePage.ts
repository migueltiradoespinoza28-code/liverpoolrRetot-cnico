import { Page, expect } from '@playwright/test';
import { selectors } from '../core/selectors';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  // Cierra modales (cookies, tienda, newsletter) cuando aparezcan
  async registerOverlayHandlers() {
    const closeBtn = this.page
      .locator('[role="dialog"], .modal, [class*="modal"]')
      .getByRole('button', { name: /cerrar|close|aceptar|entendido|×/i })
      .first();
    await this.page.addLocatorHandler(closeBtn, async (btn) => { await btn.click({ timeout: 3_000 }).catch(() => {}); }, {
      noWaitAfter: true,
    });
  }

  // Si el WAF nos bloquea, que el error lo diga claramente
  async assertNotBlocked() {
    const title = await this.page.title();
    const body = (await this.page.locator('body').innerText({ timeout: 5_000 }).catch(() => '')).slice(0, 2_000);
    expect(
      selectors.botWall.test(title) || selectors.botWall.test(body),
      'La página respondió con una protección anti-bot (WAF/CAPTCHA). Ver TEST_STRATEGY.md',
    ).toBe(false);
  }
}
