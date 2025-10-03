import { json, error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import type { DatasetMetadata } from '$lib/types/dataset';
import { searchCatalog } from '$lib/services/datasetSearch.shared';

const catalogFileUrl = new URL('../../../lib/data/datasetCatalog.json', import.meta.url);

let cachedCatalog: DatasetMetadata[] | null = null;
let inflightCatalog: Promise<DatasetMetadata[]> | null = null;

const loadCatalog = async (): Promise<DatasetMetadata[]> => {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  if (inflightCatalog) {
    return inflightCatalog;
  }

  inflightCatalog = readFile(catalogFileUrl, 'utf-8')
    .then((contents) => {
      const data = JSON.parse(contents);
      if (!Array.isArray(data)) {
        throw new Error('Unexpected dataset catalog payload.');
      }
      cachedCatalog = data as DatasetMetadata[];
      return cachedCatalog;
    })
    .finally(() => {
      inflightCatalog = null;
    });

  return inflightCatalog;
};

export const GET = async ({ url }) => {
  const query = url.searchParams.get('q') ?? '';

  if (!query.trim()) {
    return json([]);
  }

  let catalog: DatasetMetadata[];

  try {
    catalog = await loadCatalog();
  } catch (cause) {
    console.error('Failed to load dataset catalog for search', cause);
    throw error(500, 'Failed to load dataset catalog');
  }

  const results = searchCatalog(catalog, query);
  return json(results);
};
