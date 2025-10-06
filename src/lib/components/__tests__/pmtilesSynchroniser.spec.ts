import { describe, expect, test, vi } from 'vitest';
import { syncPmtilesLayers, type MaplibreLike } from '$lib/components/pmtilesSynchroniser';
import type { PMTilesLayerConfig } from '$lib/types/pmtiles';

type MockFn = ReturnType<typeof vi.fn>;

type MockMap = {
  getLayer: MockFn;
  removeLayer: MockFn;
  getSource: MockFn;
  removeSource: MockFn;
  addSource: MockFn;
  addLayer: MockFn;
  setPaintProperty: MockFn;
  setLayoutProperty: MockFn;
};

const createMockMap = (): MockMap => ({
  getLayer: vi.fn(),
  removeLayer: vi.fn(),
  getSource: vi.fn(),
  removeSource: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  setPaintProperty: vi.fn(),
  setLayoutProperty: vi.fn()
});

const layerConfig: PMTilesLayerConfig = {
  id: 'test-layer',
  url: 'https://example.com/data.pmtiles',
  layerType: 'fill',
  sourceType: 'vector',
  sourceLayer: 'test-layer',
  paint: { 'fill-color': '#123456' },
  layout: { visibility: 'visible' }
};

describe('syncPmtilesLayers', () => {
  test('adds a new PMTiles layer and source when requested', () => {
    const map = createMockMap();
    const attachedLayerIds = new Set<string>();
    const layerStates = new Map<string, { sourceId: string; url: string }>();

    syncPmtilesLayers({
      map: map as unknown as MaplibreLike,
      pmtilesLayers: [layerConfig],
      attachedLayerIds,
      layerStates,
      getSourceId: (layerId) => `${layerId}-source`
    });

    expect(map.addSource).toHaveBeenCalledWith(
      `${layerConfig.id}-source`,
      expect.objectContaining({ url: `pmtiles://${layerConfig.url}` })
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: layerConfig.id,
        source: `${layerConfig.id}-source`,
        type: layerConfig.layerType
      })
    );
    expect(attachedLayerIds.has(layerConfig.id)).toBe(true);
    expect(layerStates.get(layerConfig.id)).toEqual({
      sourceId: `${layerConfig.id}-source`,
      url: layerConfig.url
    });
  });

  test('removes layers and sources that are no longer present', () => {
    const map = createMockMap();
    const attachedLayerIds = new Set<string>([layerConfig.id]);
    const layerStates = new Map([[layerConfig.id, { sourceId: `${layerConfig.id}-source`, url: layerConfig.url }]]);

    map.getLayer
      .mockImplementationOnce(() => ({ id: layerConfig.id }))
      .mockImplementationOnce(() => ({ id: layerConfig.id }))
      .mockReturnValue(undefined);
    map.getSource
      .mockImplementationOnce(() => ({ id: `${layerConfig.id}-source` }))
      .mockImplementationOnce(() => ({ id: `${layerConfig.id}-source` }))
      .mockReturnValue(undefined);

    syncPmtilesLayers({
      map: map as unknown as MaplibreLike,
      pmtilesLayers: [],
      attachedLayerIds,
      layerStates,
      getSourceId: (layerId) => `${layerId}-source`
    });

    expect(map.removeLayer).toHaveBeenCalledWith(layerConfig.id);
    expect(map.removeSource).toHaveBeenCalledWith(`${layerConfig.id}-source`);
    expect(attachedLayerIds.has(layerConfig.id)).toBe(false);
    expect(layerStates.has(layerConfig.id)).toBe(false);
  });

  test('reloads a layer when the PMTiles URL changes', () => {
    const map = createMockMap();
    const attachedLayerIds = new Set<string>([layerConfig.id]);
    const layerStates = new Map([[layerConfig.id, { sourceId: `${layerConfig.id}-source`, url: 'https://old.example.com/data.pmtiles' }]]);

    map.getLayer
      .mockImplementationOnce(() => ({ id: layerConfig.id }))
      .mockImplementationOnce(() => ({ id: layerConfig.id }))
      .mockReturnValue(undefined);
    map.getSource
      .mockImplementationOnce(() => ({ id: `${layerConfig.id}-source` }))
      .mockReturnValue(undefined);

    syncPmtilesLayers({
      map: map as unknown as MaplibreLike,
      pmtilesLayers: [layerConfig],
      attachedLayerIds,
      layerStates,
      getSourceId: (layerId) => `${layerId}-source`
    });

    expect(map.removeLayer).toHaveBeenCalledWith(layerConfig.id);
    expect(map.removeSource).toHaveBeenCalledWith(`${layerConfig.id}-source`);
    expect(map.addSource).toHaveBeenCalledWith(
      `${layerConfig.id}-source`,
      expect.objectContaining({ url: `pmtiles://${layerConfig.url}` })
    );
    expect(map.addLayer).toHaveBeenCalled();
  });

  test('updates paint and layout when layer already exists', () => {
    const map = createMockMap();
    const attachedLayerIds = new Set<string>([layerConfig.id]);
    const layerStates = new Map([[layerConfig.id, { sourceId: `${layerConfig.id}-source`, url: layerConfig.url }]]);

    map.getLayer.mockReturnValue({ id: layerConfig.id });
    map.getSource.mockReturnValue({ id: `${layerConfig.id}-source` });

    syncPmtilesLayers({
      map: map as unknown as MaplibreLike,
      pmtilesLayers: [layerConfig],
      attachedLayerIds,
      layerStates,
      getSourceId: (layerId) => `${layerId}-source`
    });

    expect(map.setPaintProperty).toHaveBeenCalledWith(
      layerConfig.id,
      'fill-color',
      '#123456'
    );
    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      layerConfig.id,
      'visibility',
      'visible'
    );
  });
});
