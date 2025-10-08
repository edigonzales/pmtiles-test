import type {
  LayerSpecification,
  SourceSpecification,
  StyleSpecification
} from '@maplibre/maplibre-gl-style-spec';
import type { BasemapId } from '$lib/basemaps';

const cloneDeep = <T>(value: T): T => {
  const structured = (globalThis as typeof globalThis & {
    structuredClone?: <V>(input: V) => V;
  }).structuredClone;
  if (typeof structured === 'function') {
    return structured(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const isAbsoluteUrl = (value: string) => {
  if (!value) return false;
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
};

const resolveUrl = (value: string | null | undefined, baseUrl?: string) => {
  if (value == null || value === '') {
    return value ?? null;
  }
  if (!baseUrl || isAbsoluteUrl(value) || value.startsWith('data:')) {
    return value;
  }
  try {
    const resolved = new URL(value, baseUrl).toString();
    return resolved.replace(/%7B/gi, '{').replace(/%7D/gi, '}');
  } catch (error) {
    console.warn('basemapManager: failed to resolve relative URL', { value, baseUrl, error });
    return value;
  }
};

export const normaliseStyleSpecification = (
  style: StyleSpecification,
  styleUrl?: string
): StyleSpecification => {
  const clone = cloneDeep(style) as StyleSpecification;

  if (styleUrl) {
    if (typeof clone.sprite === 'string') {
      clone.sprite = resolveUrl(clone.sprite, styleUrl) ?? undefined;
    }
    if (typeof clone.glyphs === 'string') {
      clone.glyphs = resolveUrl(clone.glyphs, styleUrl) ?? undefined;
    }
  }

  if (clone.sources) {
    for (const [sourceId, source] of Object.entries(clone.sources)) {
      if (!source || typeof source !== 'object') continue;
      if ('url' in source && typeof source.url === 'string') {
        clone.sources[sourceId] = {
          ...source,
          url: resolveUrl(source.url, styleUrl) ?? source.url
        } as SourceSpecification;
      }
      if ('tiles' in source && Array.isArray(source.tiles)) {
        clone.sources[sourceId] = {
          ...clone.sources[sourceId],
          tiles: source.tiles.map((tile) =>
            typeof tile === 'string' ? (resolveUrl(tile, styleUrl) ?? tile) : tile
          )
        } as SourceSpecification;
      }
    }
  }

  return clone;
};

export interface PreparedBasemapStyle {
  basemapId: BasemapId;
  sources: Record<string, SourceSpecification>;
  sourceIds: string[];
  layers: LayerSpecification[];
  layerIds: string[];
  sprite: string | null;
  glyphs: string | null;
  visibility: Record<string, 'visible' | 'none'>;
}

export const prepareBasemapStyle = (
  basemapId: BasemapId,
  style: StyleSpecification,
  { visible = true }: { visible?: boolean } = {}
): PreparedBasemapStyle => {
  const spec = cloneDeep(style) as StyleSpecification;
  const sources: Record<string, SourceSpecification> = {};
  const sourceIds: string[] = [];
  const spriteValue = typeof spec.sprite === 'string' ? spec.sprite : null;
  const glyphValue = typeof spec.glyphs === 'string' ? spec.glyphs : null;

  if (spec.sources) {
    for (const [sourceId, source] of Object.entries(spec.sources)) {
      const prefixedId = `${basemapId}::${sourceId}`;
      sources[prefixedId] = source as SourceSpecification;
      sourceIds.push(prefixedId);
    }
  }

  const originalLayers = spec.layers ?? [];
  const layerIdMap = new Map<string, string>();
  for (const layer of originalLayers) {
    const prefixedId = `${basemapId}::${layer.id}`;
    layerIdMap.set(layer.id, prefixedId);
  }

  const layers: LayerSpecification[] = [];
  const layerIds: string[] = [];
  const visibility: Record<string, 'visible' | 'none'> = {};

  for (const layer of originalLayers) {
    const prefixedId = layerIdMap.get(layer.id);
    if (!prefixedId) continue;

    const originalRef = (layer as { ref?: string }).ref;
    const metadata = {
      ...(layer.metadata ?? {}),
      'pmtiles-test:layer-type': 'basemap',
      'pmtiles-test:basemap-id': basemapId
    } as Record<string, unknown>;

    const layout = layer.layout ? { ...layer.layout } : undefined;
    const preparedLayer: LayerSpecification = {
      ...layer,
      id: prefixedId,
      metadata,
      ...(layout ? { layout } : {})
    } as LayerSpecification;

    if ('source' in preparedLayer && typeof preparedLayer.source === 'string') {
      const prefixedSourceId = `${basemapId}::${preparedLayer.source}`;
      if (sources[prefixedSourceId]) {
        preparedLayer.source = prefixedSourceId;
      }
    }

    if (typeof originalRef === 'string') {
      const refId = layerIdMap.get(originalRef);
      if (refId) {
        (preparedLayer as { ref?: string }).ref = refId;
      }
    }

    const originalVisibility: 'visible' | 'none' =
      layout?.visibility === 'none' ? 'none' : 'visible';
    visibility[prefixedId] = originalVisibility;

    layers.push(preparedLayer);
    layerIds.push(prefixedId);
  }

  if (!visible) {
    for (const layer of layers) {
      const layout = layer.layout ? { ...layer.layout } : {};
      layout.visibility = 'none';
      layer.layout = layout as LayerSpecification['layout'];
    }
  }

  return {
    basemapId,
    sources,
    sourceIds,
    layers,
    layerIds,
    sprite: spriteValue,
    glyphs: glyphValue,
    visibility
  };
};

export const mergePreparedBasemapIntoStyle = (
  style: StyleSpecification,
  prepared: PreparedBasemapStyle
) => {
  style.sources = { ...(style.sources ?? {}), ...prepared.sources };
  style.layers = [...(style.layers ?? []), ...prepared.layers];
};

export const collectBasemapLayerIds = (
  preparedBasemaps: Iterable<PreparedBasemapStyle>
): Set<string> => {
  const ids = new Set<string>();
  for (const prepared of preparedBasemaps) {
    for (const layerId of prepared.layerIds) {
      ids.add(layerId);
    }
  }
  return ids;
};
