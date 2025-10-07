import { describe, expect, it } from 'vitest';
import type { DatasetMetadata, SelectedDatasetState } from '$lib/types/dataset';
import type { LayerType } from '$lib/types/pmtiles';
import { createLayerConfigForDataset } from '../pmtilesLayers';

const createDataset = (layerType: LayerType): DatasetMetadata => ({
  id: 'dataset-1',
  title: 'Test dataset',
  summary: 'Summary',
  description: 'Description',
  theme: 'Theme',
  provider: 'Provider',
  geometryType: 'Polygon',
  keywords: [],
  defaultStyleId: 'default',
  defaultVersionId: 'v1',
  mapConfig: {
    layerType,
    sourceLayer: 'layer',
    sourceType: 'vector',
    minzoom: 0,
    maxzoom: 14
  },
  styles: [
    {
      id: 'default',
      label: 'Default',
      description: 'Default style',
      paint:
        layerType === 'fill'
          ? {
              'fill-color': '#123456',
              'fill-opacity': 0.6,
              'fill-outline-color': '#654321'
            }
          : {
              'line-width': 4
            },
      layout: {
        visibility: 'visible'
      }
    }
  ],
  versions: [
    {
      id: 'v1',
      label: 'v1',
      url: 'https://example.com/data.pmtiles',
      effectiveFrom: '2024-01-01',
      summary: 'Initial'
    }
  ]
});

const createSelectedDataset = (layerType: LayerType): SelectedDatasetState => ({
  instanceId: 'instance-123',
  dataset: createDataset(layerType),
  activeStyleId: 'default',
  activeVersionId: 'v1',
  visible: true
});

describe('pmtilesLayers service', () => {
  it('creates a layer configuration with the dataset version url', () => {
    const entry = createSelectedDataset('line');
    const config = createLayerConfigForDataset(entry);

    expect(config).not.toBeNull();
    expect(config?.id).toBe(entry.instanceId);
    expect(config?.url).toBe('https://example.com/data.pmtiles');
    expect(config?.layerType).toBe('line');
    expect(config?.sourceType).toBe('vector');
    expect(config?.layout).toEqual({ visibility: 'visible' });
  });

  it('uses the dataset fill paint definition when available', () => {
    const entry = createSelectedDataset('fill');
    const config = createLayerConfigForDataset(entry);

    expect(config?.paint).toEqual({
      'fill-color': '#123456',
      'fill-opacity': 0.6,
      'fill-outline-color': '#654321'
    });
  });

  it('falls back to a simple red fill when the style has no paint definition', () => {
    const entry = createSelectedDataset('fill');
    entry.dataset.styles[0].paint = undefined;

    const config = createLayerConfigForDataset(entry);

    expect(config?.paint).toEqual(
      expect.objectContaining({
        'fill-color': '#ff0000',
        'fill-outline-color': '#000000',
        'fill-opacity': 0.7
      })
    );
  });

  it('returns null when the dataset has no matching version', () => {
    const entry = createSelectedDataset('fill');
    entry.activeVersionId = 'missing';

    const config = createLayerConfigForDataset(entry);
    expect(config).toBeNull();
  });

  it('defaults the source type to raster when none is provided for raster layers', () => {
    const entry = createSelectedDataset('raster');
    entry.dataset.mapConfig.sourceType = undefined;

    const config = createLayerConfigForDataset(entry);

    expect(config?.sourceType).toBe('raster');
  });

  it('defaults the source type to raster when none is provided for hillshade layers', () => {
    const entry = createSelectedDataset('hillshade');
    entry.dataset.mapConfig.sourceType = undefined;

    const config = createLayerConfigForDataset(entry);

    expect(config?.sourceType).toBe('raster');
  });
});
