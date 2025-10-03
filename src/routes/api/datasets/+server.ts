import { json } from '@sveltejs/kit';
import { datasetCatalog } from '$lib/data/datasetCatalog.server';

export const GET = () => json(datasetCatalog);
