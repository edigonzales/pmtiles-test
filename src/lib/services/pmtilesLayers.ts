import type { DatasetStyleDefinition, SelectedDatasetState } from '$lib/types/dataset';
import type { LayerType, PMTilesLayerConfig } from '$lib/types/pmtiles';

const SIMPLE_FILL_PAINT: Record<string, unknown> = {
  'fill-color': '#ff0000',
  'fill-outline-color': '#000000',
  'fill-opacity': 0.7
};

const clonePaint = (layerType: LayerType, style: DatasetStyleDefinition | undefined) => {
  if (style?.paint) {
    return { ...style.paint };
  }

  if (layerType === 'fill') {
    return { ...SIMPLE_FILL_PAINT };
  }

  return undefined;
};

const cloneLayout = (style: DatasetStyleDefinition | undefined) => {
  const layout = style?.layout ? { ...style.layout } : {};
  if (!layout.visibility) {
    layout.visibility = 'visible';
  }
  return layout;
};

export const createLayerConfigForDataset = (
  entry: SelectedDatasetState
): PMTilesLayerConfig | null => {
  const style = entry.dataset.styles.find((item) => item.id === entry.activeStyleId);
  const version = entry.dataset.versions.find((item) => item.id === entry.activeVersionId);

  if (!version) {
    return null;
  }

  const layerType = style?.layerTypeOverride ?? entry.dataset.mapConfig.layerType;
  const paint = clonePaint(layerType, style);
  const layout = cloneLayout(style);

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
    maxzoom: entry.dataset.mapConfig.maxzoom,
    role: 'foreground'
  } satisfies PMTilesLayerConfig;
};
