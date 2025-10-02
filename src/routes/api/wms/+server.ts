import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { WMSCache } from '$lib/server/wmsCache';
import {
  wmsCacheDirectory,
  wmsCacheMaxAgeMs,
  wmsCacheMaxBytes,
  wmsProxyBaseUrl
} from '$lib/server/wmsProxyConfig';

const cache = new WMSCache({
  directory: wmsCacheDirectory,
  maxAgeMs: wmsCacheMaxAgeMs,
  maxBytes: wmsCacheMaxBytes
});

const isPngResponse = (contentType: string | null) =>
  !!contentType && contentType.toLowerCase().includes('image/png');

export const GET: RequestHandler = async ({ url, fetch, setHeaders }) => {
  if (!url.searchParams.size) {
    throw error(400, 'Missing WMS query parameters.');
  }

  const upstreamUrl = `${wmsProxyBaseUrl}?${url.searchParams.toString()}`;

  const cached = await cache.get(upstreamUrl);
  if (cached) {
    setHeaders({
      'Content-Type': cached.contentType,
      'Cache-Control': 'public, max-age=0, must-revalidate'
    });

    const body = new Uint8Array(cached.buffer);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': cached.contentType
      }
    });
  }

  const response = await fetch(upstreamUrl);

  if (!response.ok) {
    throw error(response.status, `Upstream WMS request failed with status ${response.status}.`);
  }

  const contentType = response.headers.get('content-type');
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (isPngResponse(contentType)) {
    await cache.set(upstreamUrl, buffer, contentType ?? 'image/png');
  }

  const headers = new Headers();
  if (contentType) {
    headers.set('Content-Type', contentType);
    setHeaders({ 'Content-Type': contentType });
  }

  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  setHeaders({ 'Cache-Control': 'public, max-age=0, must-revalidate' });

  const body = new Uint8Array(buffer);

  return new Response(body, { status: response.status, headers });
};
