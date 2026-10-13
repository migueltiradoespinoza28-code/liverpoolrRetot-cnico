import { test as base } from '@playwright/test';
import { HomePage } from '../src/pages/HomePage';
import { SearchResultsPage } from '../src/pages/SearchResultsPage';
import { SearchResponseInterceptor } from '../src/network/SearchResponseInterceptor';
import { SearchScenario } from '../src/core/types';
import scenarios from '../data/search-scenarios.json';
import { env } from '../config/env';

type Fixtures = {
  interceptor: SearchResponseInterceptor;
  home: HomePage;
  results: SearchResultsPage;
};

export const test = base.extend<Fixtures>({
  interceptor: async ({ page }, use) => {
    const i = new SearchResponseInterceptor(page, env.searchResponseUrl);
    i.start(); // se activa ANTES de navegar para no perder la primera respuesta
    await use(i);
    i.stop();
  },
  home: async ({ page }, use) => use(new HomePage(page)),
  results: async ({ page, interceptor }, use) => use(new SearchResultsPage(page, interceptor)),
});

export { expect } from '@playwright/test';

export function selectedScenarios(): SearchScenario[] {
  const all = scenarios as SearchScenario[];
  if (env.adHocTerm) return [{ id: 'ad-hoc', term: env.adHocTerm, color: env.adHocColor, sort: all[0].sort }];
  return env.allScenarios ? all : all.filter((s) => s.default);
}
