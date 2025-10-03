import type { DatasetMetadata, DatasetSearchResult } from '$lib/types/dataset';

const DATASET_ENDPOINT = '/api/datasets';

const searchableFields: Array<keyof DatasetMetadata | 'keywords'> = [
  'title',
  'summary',
  'description',
  'theme',
  'provider',
  'keywords'
];

const fieldWeights: Record<string, number> = {
  title: 4,
  summary: 3,
  description: 2,
  theme: 2,
  provider: 1,
  keywords: 3
};

const normalise = (value: string) => value.trim().toLowerCase();

const collectMatches = (dataset: DatasetMetadata, query: string) => {
  const matches = new Set<string>();
  let score = 0;

  for (const field of searchableFields) {
    const weight = fieldWeights[field] ?? 1;
    if (field === 'keywords') {
      if (dataset.keywords.some((keyword) => normalise(keyword).includes(query))) {
        matches.add('keywords');
        score += weight;
      }
    } else {
      const value = dataset[field];
      if (typeof value === 'string' && normalise(value).includes(query)) {
        matches.add(field);
        score += weight;
      }
    }
  }

  return { matches: Array.from(matches), score };
};

let catalogCache: DatasetMetadata[] | null = null;
let inflightCatalog: Promise<DatasetMetadata[]> | null = null;

const parseCatalogPayload = (payload: unknown): DatasetMetadata[] => {
  if (Array.isArray(payload)) {
    return payload as DatasetMetadata[];
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'datasets' in payload &&
    Array.isArray((payload as { datasets: unknown }).datasets)
  ) {
    return (payload as { datasets: DatasetMetadata[] }).datasets;
  }

  throw new Error('Unexpected dataset catalog payload.');
};

const fetchCatalog = async (): Promise<DatasetMetadata[]> => {
  if (catalogCache) {
    return catalogCache;
  }

  if (inflightCatalog) {
    return inflightCatalog;
  }

  if (typeof fetch === 'undefined') {
    throw new Error('Fetch API is not available in this environment.');
  }

  inflightCatalog = fetch(DATASET_ENDPOINT)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load dataset catalog (${response.status})`);
      }
      return response.json();
    })
    .then((payload) => {
      const catalog = parseCatalogPayload(payload);
      catalogCache = catalog;
      return catalog;
    })
    .finally(() => {
      inflightCatalog = null;
    });

  return inflightCatalog;
};

export const clearDatasetCatalogCache = () => {
  catalogCache = null;
};

export const searchDatasets = async (query: string): Promise<DatasetSearchResult[]> => {
  const datasets = await fetchCatalog();
  const normalisedQuery = normalise(query);

  if (!normalisedQuery) {
    return [];
  }

  const results: DatasetSearchResult[] = [];

  for (const dataset of datasets) {
    const { matches, score } = collectMatches(dataset, normalisedQuery);
    if (score > 0) {
      results.push({ dataset, score, matches });
    }
  }

  results.sort((a, b) => {
    if (b.score === a.score) {
      return a.dataset.title.localeCompare(b.dataset.title);
    }
    return b.score - a.score;
  });

  return results;
};

export const getDatasetCatalog = async (): Promise<DatasetMetadata[]> => fetchCatalog();
