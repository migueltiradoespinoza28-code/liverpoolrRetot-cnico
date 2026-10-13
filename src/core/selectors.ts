// Selectores centralizados. Se prefieren los data-testid del sitio sobre clases utilitarias (Tailwind/MUI)
const union = (...s: string[]) => s.join(', ');

export const selectors = {
  home: {
    searchInput: union('#mainSearchbar', 'input[type="search"]', 'input[placeholder*="Buscar" i]'),
  },
  results: {
    productCard: union('a[data-testid$="-card-card-link"]', '#plp-page-card-product-list > a'),
    productIdFromTestId: /^(\d+)-card-card-link$/,
    // Anuncios que la UI inserta fuera del orden elegido (no son resultados orgánicos)
    sponsoredLabel: /patrocinado/i,
    productName: 'h3',
    productPrice: '[data-testid$="-price"]',
    filterOptionLabel: 'label',
  },
  botWall: /access denied|request unsuccessful|incapsula|captcha/i,
} as const;
