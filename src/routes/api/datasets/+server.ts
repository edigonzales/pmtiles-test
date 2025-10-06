import { json } from '@sveltejs/kit';
import { datasetCollection } from '$lib/data/datasetCollection.server';

export const GET = () => json(datasetCollection);
