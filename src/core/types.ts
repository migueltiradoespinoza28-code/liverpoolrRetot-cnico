export interface Product {
  name: string;
  price: number | null;
  prices?: number[];
  id?: string;
  sponsored?: boolean;
}

export interface SearchScenario {
  id: string;
  term: string;
  color?: string;
  sort?: string;
  default?: boolean;
}
