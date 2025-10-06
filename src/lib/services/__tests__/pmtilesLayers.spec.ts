import { describe, expect, it } from 'vitest';
import type { DatasetMetadata, SelectedDatasetState } from '$lib/types/dataset';
import type { LayerType } from '$lib/types/pmtiles';
import {
  applyColorToPaint,
  createColorFromSeed,
  createLayerConfigForDataset
} from '../pmtilesLayers';

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
      paint: {
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
  it('generates deterministic colors from a seed', () => {
    const first = createColorFromSeed('abc');
    const second = createColorFromSeed('abc');
    const third = createColorFromSeed('def');

    expect(first).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });

  it('applies random color overrides and preserves existing paint values', () => {
    const paint = applyColorToPaint({ 'line-width': 4 }, 'line', '#123456');
    expect(paint['line-color']).toBe('#123456');
    expect(paint['line-width']).toBe(4);
    expect(paint['line-opacity']).toBeCloseTo(0.9);
  });

  it('creates a layer configuration with the dataset version url', () => {
    const entry = createSelectedDataset('line');
    const config = createLayerConfigForDataset(entry);
    const color = createColorFromSeed(entry.instanceId);

    expect(config).not.toBeNull();
    expect(config?.id).toBe(entry.instanceId);
    expect(config?.url).toBe('https://example.com/data.pmtiles');
    expect(config?.layerType).toBe('line');
    expect(config?.paint?.['line-color']).toBe(color);
    expect(config?.layout).toEqual({ visibility: 'visible' });
  });

  it('returns null when the dataset has no matching version', () => {
    const entry = createSelectedDataset('fill');
    entry.activeVersionId = 'missing';

    const config = createLayerConfigForDataset(entry);
    expect(config).toBeNull();
  });
});
