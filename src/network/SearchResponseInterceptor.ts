import { Page, Response } from '@playwright/test';
import { Product } from '../core/types';
import { extractProducts } from './productExtractor';
import { parseEmbeddedJson } from './embeddedJson';

export interface CapturedPayload {
  url: string;
  source: 'xhr-json' | 'ssr-html';
  products: Product[];
  capturedAt: number;
}

// Solo observa las respuestas (no usa page.route), asi no altera el comportamiento de la app
export class SearchResponseInterceptor {
  private payloads: CapturedPayload[] = [];
  private waiters: Array<() => void> = [];
  private readonly listener = (r: Response) => void this.onResponse(r);

  constructor(private readonly page: Page, private readonly urlPattern: RegExp) {}

  start() { this.page.on('response', this.listener); }
  stop() { this.page.off('response', this.listener); }

  private async onResponse(res: Response) {
    try {
      if (res.status() >= 300 || !this.urlPattern.test(res.url())) return;
      const type = res.request().resourceType();
      const ct = res.headers()['content-type'] ?? '';
      let json: unknown;
      let source: CapturedPayload['source'];

      if ((type === 'xhr' || type === 'fetch') && ct.includes('json')) {
        json = await res.json();
        source = 'xhr-json';
      } else if (type === 'document' && ct.includes('html') && res.frame() === this.page.mainFrame()) {
        // Carga inicial renderizada en servidor: los datos vienen embebidos en el HTML
        json = parseEmbeddedJson(await res.text());
        source = 'ssr-html';
      } else return;

      const products = extractProducts(json);
      if (products.length) {
        this.payloads.push({ url: res.url(), source, products, capturedAt: Date.now() });
        this.waiters.splice(0).forEach((resolve) => resolve());
      }
    } catch {
      // respuestas sin body o redirecciones: no aplican
    }
  }

  // Ejecuta la accion y espera la respuesta con productos que ella provoca
  async captureDuring(action: () => Promise<unknown>, timeoutMs: number): Promise<CapturedPayload | undefined> {
    const before = this.payloads.length;
    const arrived = new Promise<void>((resolve) => this.waiters.push(resolve));
    await action();
    if (this.payloads.length === before) {
      let timer: NodeJS.Timeout | undefined;
      await Promise.race([arrived, new Promise<void>((r) => (timer = setTimeout(r, timeoutMs)))]);
      clearTimeout(timer);
    }
    return this.payloads.length > before ? this.latest() : undefined;
  }

  latest(): CapturedPayload | undefined { return this.payloads.at(-1); }
  all(): CapturedPayload[] { return [...this.payloads]; }
}
