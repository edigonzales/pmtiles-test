import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

interface CacheEntryMeta {
  key: string;
  hash: string;
  createdAt: number;
  lastAccessed: number;
  size: number;
  contentType: string;
}

export interface CacheOptions {
  directory: string;
  maxBytes: number;
  maxAgeMs: number;
}

export interface CacheHit {
  buffer: Buffer;
  contentType: string;
}

export class WMSCache {
  private ready = false;

  constructor(private readonly options: CacheOptions) {}

  private async ensureReady() {
    if (this.ready) return;
    await fs.mkdir(this.options.directory, { recursive: true });
    this.ready = true;
  }

  private static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private entryPaths(hash: string) {
    const baseName = path.join(this.options.directory, hash);
    return {
      dataPath: `${baseName}.bin`,
      metaPath: `${baseName}.json`
    };
  }

  private async readMeta(metaPath: string): Promise<CacheEntryMeta | null> {
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(raw) as CacheEntryMeta;
      if (!meta.hash || !meta.createdAt || !meta.size) return null;
      return meta;
    } catch (error) {
      return null;
    }
  }

  private async writeMeta(metaPath: string, meta: CacheEntryMeta) {
    await fs.writeFile(metaPath, JSON.stringify(meta));
  }

  private async deleteEntry(hash: string) {
    const { dataPath, metaPath } = this.entryPaths(hash);
    await fs.rm(dataPath, { force: true });
    await fs.rm(metaPath, { force: true });
  }

  private async allMetas(): Promise<CacheEntryMeta[]> {
    await this.ensureReady();
    const files = await fs.readdir(this.options.directory);
    const metas: CacheEntryMeta[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const meta = await this.readMeta(path.join(this.options.directory, file));
      if (meta) {
        metas.push(meta);
      }
    }
    return metas;
  }

  private async prune() {
    const now = Date.now();
    const metas = await this.allMetas();
    const freshMetas: CacheEntryMeta[] = [];

    for (const meta of metas) {
      const isExpired = now - meta.createdAt > this.options.maxAgeMs;
      if (isExpired) {
        await this.deleteEntry(meta.hash);
      } else {
        freshMetas.push(meta);
      }
    }

    let totalSize = freshMetas.reduce((sum, entry) => sum + entry.size, 0);

    if (totalSize <= this.options.maxBytes) {
      return;
    }

    freshMetas.sort((a, b) => a.createdAt - b.createdAt);

    while (totalSize > this.options.maxBytes && freshMetas.length > 0) {
      const oldest = freshMetas.shift();
      if (!oldest) break;
      await this.deleteEntry(oldest.hash);
      totalSize -= oldest.size;
    }
  }

  async get(key: string): Promise<CacheHit | null> {
    await this.ensureReady();
    const hash = WMSCache.hashKey(key);
    const { dataPath, metaPath } = this.entryPaths(hash);
    const meta = await this.readMeta(metaPath);
    if (!meta) return null;

    const isExpired = Date.now() - meta.createdAt > this.options.maxAgeMs;
    if (isExpired) {
      await this.deleteEntry(hash);
      return null;
    }

    try {
      const buffer = await fs.readFile(dataPath);
      meta.lastAccessed = Date.now();
      await this.writeMeta(metaPath, meta);
      return { buffer, contentType: meta.contentType };
    } catch (error) {
      await this.deleteEntry(hash);
      return null;
    }
  }

  async set(key: string, buffer: Buffer, contentType: string) {
    await this.ensureReady();
    const hash = WMSCache.hashKey(key);
    const { dataPath, metaPath } = this.entryPaths(hash);
    const now = Date.now();
    const meta: CacheEntryMeta = {
      key,
      hash,
      createdAt: now,
      lastAccessed: now,
      size: buffer.byteLength,
      contentType
    };

    await fs.writeFile(dataPath, buffer);
    await this.writeMeta(metaPath, meta);

    await this.prune();
  }
}
