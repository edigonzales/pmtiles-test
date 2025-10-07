<script lang="ts" context="module">
  export type { LayerType, PMTilesLayerConfig } from '$lib/types/pmtiles';
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { basemapConfigs, type BasemapId } from '$lib/basemaps';
  import { syncPmtilesLayers, type LayerState } from './pmtilesSynchroniser';
  import { scheduleStyleReady } from './styleReadyScheduler';
  import { getDefaultVectorLayer } from './pmtilesMetadata';
  import type { Map as MaplibreMap } from 'maplibre-gl';
  import type { PMTilesLayerConfig } from '$lib/types/pmtiles';
  import type { PMTiles } from 'pmtiles';

  export let basemap: BasemapId = 'swisstopo';
  export let center: [number, number] = [7.64, 47.3];
  export let zoom = 9;
  export let pitch = 0;
  export let bearing = 0;
  export let pmtilesLayers: PMTilesLayerConfig[] = [];

  const dispatch = createEventDispatcher<{ ready: MaplibreMap }>();

  let container: HTMLDivElement | null = null;
  let map: MaplibreMap | null = null;
  let currentBasemap: BasemapId | null = null;
  let pmtilesProtocol: import('pmtiles').Protocol | null = null;
  let createPmtilesInstance: ((url: string) => PMTiles) | null = null;
  const registeredPmtiles = new Map<string, PMTiles>();
  const discoveredSourceLayers = new Map<string, string>();
  const pendingMetadataRequests = new Map<string, Promise<void>>();
  const attachedLayerIds = new Set<string>();
  const layerStates = new Map<string, LayerState>();
  let pendingSync = false;
  let disposed = false;
  let loadError: string | null = null;
  let registerProtocol: ((name: string, handler: any) => void) | null = null;
  let unregisterProtocol: ((name: string) => void) | null = null;
  let protocolRegistered = false;

  const getSourceId = (layerId: string) => `${layerId}-source`;

  const ensureVectorSourceLayer = (config: PMTilesLayerConfig, instance: PMTiles) => {
    if (config.sourceLayer || config.sourceType !== 'vector' || discoveredSourceLayers.has(config.url)) {
      return;
    }

    if (pendingMetadataRequests.has(config.url)) {
      return;
    }

    const request = instance
      .getMetadata()
      .then((metadata) => {
        const sourceLayer = getDefaultVectorLayer(metadata as any);
        if (sourceLayer) {
          discoveredSourceLayers.set(config.url, sourceLayer);
          console.log('MapView: discovered PMTiles vector layer', {
            layerId: config.id,
            url: config.url,
            sourceLayer
          });
          if (!disposed) {
            scheduleSync();
          }
        } else {
          console.log('MapView: PMTiles metadata contained no vector layers', {
            layerId: config.id,
            url: config.url
          });
        }
      })
      .catch((error) => {
        console.error('MapView: failed to inspect PMTiles metadata', {
          layerId: config.id,
          url: config.url,
          error
        });
      })
      .finally(() => {
        pendingMetadataRequests.delete(config.url);
      });

    pendingMetadataRequests.set(config.url, request);
  };

  const preparePmtilesSource = (config: PMTilesLayerConfig) => {
    if (!pmtilesProtocol || !createPmtilesInstance) {
      return;
    }

    let instance = registeredPmtiles.get(config.url);
    if (!instance) {
      instance = createPmtilesInstance(config.url);
      pmtilesProtocol.add(instance);
      registeredPmtiles.set(config.url, instance);

      console.debug('MapView: registered PMTiles archive', {
        layerId: config.id,
        url: config.url
      });
    }

    ensureVectorSourceLayer(config, instance);
  };

  const resolvePmtilesLayers = () =>
    pmtilesLayers.map((config) => {
      if (config.sourceLayer || config.sourceType !== 'vector') {
        return config;
      }
      const discovered = discoveredSourceLayers.get(config.url);
      if (!discovered) {
        return config;
      }
      return { ...config, sourceLayer: discovered };
    });

  const scheduleSync = () => {
    if (!map) return;

    const performSync = () => {
      if (!map) return;
      pendingSync = false;
      syncPmtilesLayers({
        map,
        pmtilesLayers: resolvePmtilesLayers(),
        attachedLayerIds,
        layerStates,
        getSourceId,
        prepareSource: preparePmtilesSource,
        logger: console
      });
    };

    if (map.isStyleLoaded?.()) {
      performSync();
      return;
    }

    if (!pendingSync) {
      pendingSync = true;
      scheduleStyleReady(map, () => {
        performSync();
      });
    }
  };

  onMount(() => {
    if (!container) return;

    (async () => {
      try {
        const [maplibre, pmtilesModule] = await Promise.all([
          import('maplibre-gl'),
          import('pmtiles')
        ]);

        const { Protocol, PMTiles } = pmtilesModule;

        if (!Protocol || !PMTiles) {
          throw new Error('PMTiles exports were not available.');
        }

        if (disposed) return;

        const namespace = maplibre.default ?? maplibre;
        const MapConstructor =
          (namespace as { Map?: typeof MaplibreMap }).Map ??
          (maplibre as { Map?: typeof MaplibreMap }).Map;
        const AttributionControlCtor =
          (namespace as { AttributionControl?: typeof import('maplibre-gl').AttributionControl })
            .AttributionControl ??
          (maplibre as { AttributionControl?: typeof import('maplibre-gl').AttributionControl })
            .AttributionControl;
        registerProtocol =
          (maplibre as { addProtocol?: typeof import('maplibre-gl').addProtocol }).addProtocol ??
          (namespace as { addProtocol?: typeof import('maplibre-gl').addProtocol }).addProtocol ??
          null;
        unregisterProtocol =
          (maplibre as { removeProtocol?: typeof import('maplibre-gl').removeProtocol })
            .removeProtocol ??
          (namespace as { removeProtocol?: typeof import('maplibre-gl').removeProtocol })
            .removeProtocol ??
          null;

        if (!MapConstructor) {
          throw new Error('MapLibre Map constructor was not available.');
        }

        pmtilesProtocol = new Protocol();
        createPmtilesInstance = (url: string) => new PMTiles(url);
        const protocolHandler = pmtilesProtocol.tile.bind(pmtilesProtocol) as any;
        if (registerProtocol) {
          registerProtocol('pmtiles', protocolHandler);
          protocolRegistered = true;
        }
        console.debug('MapView: registered PMTiles protocol', {
          hasRegisterProtocol: !!registerProtocol,
          protocolHandlerType: typeof protocolHandler,
          protocolRegistered
        });

        map = new MapConstructor({
          container,
          style: basemapConfigs[basemap].style as any,
          center,
          zoom,
          pitch,
          bearing,
          attributionControl: false
        });

        map.on('error', (event) => {
          console.error('MapView: map error', event?.error ?? event);
        });

        const estimateScaleDenominator = (zoomLevel: number, latitude: number) => {
          const EARTH_RADIUS_METERS = 6378137;
          const TILE_SIZE = 512;
          const STANDARD_DPI = 96;
          const metersPerPixel =
            (Math.cos((latitude * Math.PI) / 180) * 2 * Math.PI * EARTH_RADIUS_METERS) /
            (TILE_SIZE * Math.pow(2, zoomLevel));
          const metersPerInch = 0.0254;
          const scale = (metersPerPixel * STANDARD_DPI) / metersPerInch;
          return Number.isFinite(scale) ? Math.round(scale) : null;
        };

        map.on('zoomend', () => {
          const currentZoom = map?.getZoom();
          if (typeof currentZoom === 'number') {
            const centerLatitude = map?.getCenter()?.lat ?? 0;
            const scaleDenominator = estimateScaleDenominator(currentZoom, centerLatitude);
            console.log('MapView: zoom level changed', {
              zoom: currentZoom,
              scale: scaleDenominator ? `1:${scaleDenominator.toLocaleString()}` : null
            });
          }
        });

        if (AttributionControlCtor) {
          map.addControl(new AttributionControlCtor({ compact: true }));
        }

        currentBasemap = basemap;

        map.on('load', () => {
          scheduleSync();
          dispatch('ready', map!);
        });
      } catch (error) {
        console.error('Failed to initialise MapLibre', error);
        loadError = 'The map could not be initialised in this environment.';
      }
    })();

    return () => {
      disposed = true;
      if (map) {
        map.remove();
        map = null;
      }
      registeredPmtiles.clear();
      discoveredSourceLayers.clear();
      pendingMetadataRequests.clear();
      createPmtilesInstance = null;
      if (protocolRegistered && unregisterProtocol && pmtilesProtocol) {
        unregisterProtocol('pmtiles');
        protocolRegistered = false;
        console.debug('MapView: removed PMTiles protocol registration');
      }
      pmtilesProtocol = null;
    };
  });

  onDestroy(() => {
    disposed = true;
  });

  $: if (map && basemap && basemap !== currentBasemap && basemapConfigs[basemap]) {
    currentBasemap = basemap;
    attachedLayerIds.clear();
    layerStates.clear();
    map.setStyle(basemapConfigs[basemap].style as any);
    map.once('style.load', () => {
      scheduleSync();
      dispatch('ready', map!);
    });
  }

  $: if (map) {
    console.debug('MapView: scheduling PMTiles sync', {
      basemap: currentBasemap,
      layerCount: pmtilesLayers.length
    });
    scheduleSync();
  }
</script>

{#if loadError}
  <div class="map-error" role="alert">{loadError}</div>
{:else}
  <div class="map" bind:this={container} aria-hidden="true"></div>
{/if}

<style>
  .map,
  .map-error {
    width: 100%;
    height: 100%;
    min-height: 24rem;
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .map-error {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: var(--cds-layer, #fff);
    color: var(--cds-text-error, #da1e28);
    text-align: center;
  }
</style>
