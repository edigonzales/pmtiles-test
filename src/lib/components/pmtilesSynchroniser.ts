import type { PMTilesLayerConfig } from '$lib/types/pmtiles';
import type { Map as MaplibreMap } from 'maplibre-gl';

export type MaplibreLike = Pick<
  MaplibreMap,
  | 'getLayer'
  | 'removeLayer'
  | 'getSource'
  | 'removeSource'
  | 'addSource'
  | 'addLayer'
  | 'setPaintProperty'
  | 'setLayoutProperty'
>;

export interface LayerState {
  sourceId: string;
  url: string;
}

export interface SyncContext {
  map: MaplibreLike;
  pmtilesLayers: PMTilesLayerConfig[];
  attachedLayerIds: Set<string>;
  layerStates: Map<string, LayerState>;
  getSourceId: (layerId: string) => string;
  logger?: Pick<typeof console, 'debug'>;
}

const debug = (logger: SyncContext['logger'], message: string, payload: Record<string, unknown>) => {
  if (!logger?.debug) return;
  logger.debug(message, payload);
};

export const syncPmtilesLayers = ({
  map,
  pmtilesLayers,
  attachedLayerIds,
  layerStates,
  getSourceId,
  logger
}: SyncContext) => {
  debug(logger, 'MapView: syncing PMTiles layers', {
    layerCount: pmtilesLayers.length,
    layerIds: pmtilesLayers.map((config) => config.id)
  });

  const desired = new Map(pmtilesLayers.map((config) => [config.id, config]));

  for (const layerId of Array.from(attachedLayerIds)) {
    if (!desired.has(layerId) || !map.getLayer(layerId)) {
      const sourceId = getSourceId(layerId);
      debug(logger, 'MapView: removing PMTiles layer', {
        layerId,
        hadLayer: !!map.getLayer(layerId),
        hadSource: !!map.getSource(sourceId)
      });
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
      attachedLayerIds.delete(layerId);
      layerStates.delete(layerId);
    }
  }

  for (const config of pmtilesLayers) {
    const sourceId = getSourceId(config.id);
    const existingState = layerStates.get(config.id);

    if (existingState && existingState.url !== config.url) {
      debug(logger, 'MapView: dataset version changed, reloading layer', {
        layerId: config.id,
        previousUrl: existingState.url,
        nextUrl: config.url
      });
      if (map.getLayer(config.id)) {
        map.removeLayer(config.id);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
      attachedLayerIds.delete(config.id);
      layerStates.delete(config.id);
    }

    if (!map.getSource(sourceId)) {
      debug(logger, 'MapView: adding PMTiles source', {
        layerId: config.id,
        sourceId,
        url: config.url
      });
      map.addSource(
        sourceId,
        {
          type: config.sourceType ?? 'vector',
          url: `pmtiles://${config.url}`
        } as any
      );
    }

    if (!map.getLayer(config.id)) {
      debug(logger, 'MapView: adding PMTiles layer', {
        layerId: config.id,
        sourceLayer: config.sourceLayer,
        layerType: config.layerType
      });
      map.addLayer(
        {
          id: config.id,
          type: config.layerType,
          source: sourceId,
          ...(config.sourceLayer ? { 'source-layer': config.sourceLayer } : {}),
          paint: config.paint ?? {},
          layout: config.layout ?? {},
          minzoom: config.minzoom,
          maxzoom: config.maxzoom
        } as any
      );
      attachedLayerIds.add(config.id);
    } else {
      if (config.paint) {
        for (const [key, value] of Object.entries(config.paint)) {
          map.setPaintProperty(config.id, key, value as never);
        }
      }
      if (config.layout) {
        for (const [key, value] of Object.entries(config.layout)) {
          map.setLayoutProperty(config.id, key, value as never);
        }
      }
    }

    layerStates.set(config.id, { sourceId, url: config.url });
  }
};
