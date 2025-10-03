import type { DatasetMetadata, DatasetSearchResult } from '$lib/types/dataset';

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

export const normalise = (value: string) => value.trim().toLowerCase();

export const collectMatches = (dataset: DatasetMetadata, query: string) => {
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

export const sortResults = (results: DatasetSearchResult[]) =>
  [...results].sort((a, b) => {
    if (b.score === a.score) {
      return a.dataset.title.localeCompare(b.dataset.title);
    }
    return b.score - a.score;
  });

export const searchCatalog = (
  datasets: DatasetMetadata[],
  query: string
): DatasetSearchResult[] => {
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

  return sortResults(results);
};
