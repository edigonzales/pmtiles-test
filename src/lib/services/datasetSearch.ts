import type { DatasetMetadata, DatasetSearchResult } from '$lib/types/dataset';
import { normalise } from '$lib/services/datasetSearch.shared';

const DATASET_ENDPOINT = '/api/datasets';
const DATASET_SEARCH_ENDPOINT = '/api/dataset-search';

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

export const getDatasetCatalog = async (): Promise<DatasetMetadata[]> => {
  if (typeof fetch === 'undefined') {
    throw new Error('Fetch API is not available in this environment.');
  }

  const response = await fetch(DATASET_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Failed to load dataset catalog (${response.status})`);
  }

  const payload = await response.json();
  return parseCatalogPayload(payload);
};

export const searchDatasets = async (query: string): Promise<DatasetSearchResult[]> => {
  const normalisedQuery = normalise(query);

  if (!normalisedQuery) {
    return [];
  }

  if (typeof fetch === 'undefined') {
    throw new Error('Fetch API is not available in this environment.');
  }

  const searchParams = new URLSearchParams({ q: query.trim() });
  const response = await fetch(`${DATASET_SEARCH_ENDPOINT}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to search dataset catalog (${response.status})`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error('Unexpected dataset search payload.');
  }

  return payload as DatasetSearchResult[];
};
