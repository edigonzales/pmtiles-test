import type { DatasetStyleDefinition, SelectedDatasetState } from '$lib/types/dataset';
import type { LayerType, PMTilesLayerConfig } from '$lib/types/pmtiles';

const COLOR_PROPERTIES: Partial<Record<LayerType, string[]>> = {
  background: ['background-color'],
  fill: ['fill-color'],
  line: ['line-color'],
  circle: ['circle-color'],
  symbol: ['text-color', 'icon-color'],
  'fill-extrusion': ['fill-extrusion-color']
};

const DEFAULTS: Partial<Record<LayerType, Record<string, unknown>>> = {
  fill: {
    'fill-opacity': 0.65
  },
  line: {
    'line-width': 2,
    'line-opacity': 0.9
  },
  circle: {
    'circle-radius': 5,
    'circle-opacity': 0.85
  },
  symbol: {
    'text-halo-width': 1.2,
    'text-halo-color': '#ffffff',
    'text-opacity': 0.95
  },
  'fill-extrusion': {
    'fill-extrusion-opacity': 0.75
  }
};

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const hslToHex = (h: number, s: number, l: number) => {
  if (s === 0) {
    const gray = Math.round(l * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${gray}${gray}${gray}`;
  }

  const hueToChannel = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hueToChannel(p, q, h + 1 / 3) * 255)
    .toString(16)
    .padStart(2, '0');
  const g = Math.round(hueToChannel(p, q, h) * 255)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(hueToChannel(p, q, h - 1 / 3) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${r}${g}${b}`;
};

export const createColorFromSeed = (seed: string) => {
  const hash = hashSeed(seed);
  const hue = (hash % 360) / 360;
  const saturation = 0.65;
  const lightness = 0.55;
  return hslToHex(hue, saturation, lightness);
};

export const applyColorToPaint = (
  basePaint: DatasetStyleDefinition['paint'],
  layerType: LayerType,
  color: string
) => {
  const paint: Record<string, unknown> = { ...(basePaint ?? {}) };
  const properties = COLOR_PROPERTIES[layerType];
  if (properties) {
    for (const property of properties) {
      paint[property] = color;
    }
  }

  const defaults = DEFAULTS[layerType];
  if (defaults) {
    for (const [property, value] of Object.entries(defaults)) {
      if (paint[property] === undefined) {
        paint[property] = value;
      }
    }
  }

  return paint;
};

export const cloneLayout = (layout: DatasetStyleDefinition['layout']) =>
  layout ? { ...layout } : undefined;

export const createLayerConfigForDataset = (
  entry: SelectedDatasetState
): PMTilesLayerConfig | null => {
  const style = entry.dataset.styles.find((item) => item.id === entry.activeStyleId);
  const version = entry.dataset.versions.find((item) => item.id === entry.activeVersionId);

  if (!version) {
    return null;
  }

  const layerType = style?.layerTypeOverride ?? entry.dataset.mapConfig.layerType;
  const color = createColorFromSeed(entry.instanceId);
  const paint = applyColorToPaint(style?.paint, layerType, color);
  const layout = cloneLayout(style?.layout);

  const sourceType =
    entry.dataset.mapConfig.sourceType ?? (layerType === 'raster' || layerType === 'hillshade' ? 'raster' : 'vector');

  return {
    id: entry.instanceId,
    url: version.url,
    layerType,
    sourceType,
    sourceLayer: entry.dataset.mapConfig.sourceLayer,
    paint,
    layout,
    minzoom: entry.dataset.mapConfig.minzoom,
    maxzoom: entry.dataset.mapConfig.maxzoom
  } satisfies PMTilesLayerConfig;
};
