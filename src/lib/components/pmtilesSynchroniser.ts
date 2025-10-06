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
  | 'getStyle'
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
  prepareSource?: (config: PMTilesLayerConfig) => void;
  logger?: Pick<typeof console, 'debug' | 'log'>;
}

const debug = (logger: SyncContext['logger'], message: string, payload: Record<string, unknown>) => {
  if (!logger?.debug) return;
  logger.debug(message, payload);
};

const info = (logger: SyncContext['logger'], message: string, payload: Record<string, unknown>) => {
  if (!logger?.log) return;
  logger.log(message, payload);
};

export const syncPmtilesLayers = ({
  map,
  pmtilesLayers,
  attachedLayerIds,
  layerStates,
  getSourceId,
  logger,
  prepareSource
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
      prepareSource?.(config);
      info(logger, 'MapView: adding PMTiles source', {
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

    let layerAdded = false;

    if (!map.getLayer(config.id)) {
      if ((config.sourceType ?? 'vector') === 'vector' && !config.sourceLayer) {
        debug(logger, 'MapView: skipping PMTiles layer until source layer available', {
          layerId: config.id,
          sourceType: config.sourceType,
          layerType: config.layerType
        });
        continue;
      }
      info(logger, 'MapView: adding PMTiles layer', {
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
      layerAdded = true;
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

    if (layerAdded || map.getLayer(config.id)) {
      layerStates.set(config.id, { sourceId, url: config.url });
    } else {
      layerStates.delete(config.id);
    }
  }

  const style = map.getStyle?.();
  if (style?.layers && Array.isArray(style.layers)) {
    const layerSummaries = style.layers.map((layer: any, index: number) => ({
      order: index,
      id: layer?.id,
      name: layer?.metadata?.name ?? null,
      source: layer?.source ?? null,
      sourceLayer: layer?.['source-layer'] ?? null,
      visibility: layer?.layout?.visibility ?? 'visible'
    }));
    info(logger, 'MapView: current map layer order', layerSummaries);
  }
};
