import path from 'node:path';
import { env } from '$env/dynamic/private';

const DEFAULT_DIRECTORY = path.resolve(process.cwd(), '.wms-cache');
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day
const DEFAULT_WMS_BASE_URL = 'https://geo.so.ch/api/wms';

const parseInteger = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const wmsCacheDirectory = env.WMS_CACHE_DIR
  ? path.resolve(env.WMS_CACHE_DIR)
  : DEFAULT_DIRECTORY;

export const wmsCacheMaxBytes = parseInteger(env.WMS_CACHE_MAX_BYTES, DEFAULT_MAX_BYTES);

export const wmsCacheMaxAgeMs = parseInteger(env.WMS_CACHE_MAX_AGE_MS, DEFAULT_MAX_AGE_MS);

export const wmsProxyBaseUrl = env.WMS_PROXY_BASE_URL ?? DEFAULT_WMS_BASE_URL;
