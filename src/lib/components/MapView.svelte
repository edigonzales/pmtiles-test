<script lang="ts" context="module">
  export type { LayerType, PMTilesLayerConfig } from '$lib/types/pmtiles';
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { basemapConfigs, type BasemapId } from '$lib/basemaps';
  import { syncPmtilesLayers, type LayerState } from './pmtilesSynchroniser';
  import { getDefaultVectorLayer } from './pmtilesMetadata';
  import {
    mergePreparedBasemapIntoStyle,
    normaliseStyleSpecification,
    prepareBasemapStyle,
    type PreparedBasemapStyle
  } from './basemapManager';
  import type { Map as MaplibreMap } from 'maplibre-gl';
  import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
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
  const baseBackgroundLayerId = 'app-base-background';
  const basemapStyles = new Map<BasemapId, StyleSpecification>();
  const preparedBasemaps = new Map<BasemapId, PreparedBasemapStyle>();
  const basemapLayerIds = new Set<string>();
  const styleSpecificationPromises = new Map<BasemapId, Promise<StyleSpecification>>();
  let basemapChangeToken = 0;
  let currentBasemap: BasemapId | null = null;
  let currentSprite: string | null = null;
  let currentGlyphs: string | null = null;
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

  const cloneLayerSpecification = <T>(layer: T): T => {
    const structured = (globalThis as typeof globalThis & {
      structuredClone?: <V>(input: V) => V;
    }).structuredClone;
    if (typeof structured === 'function') {
      return structured(layer);
    }
    return JSON.parse(JSON.stringify(layer)) as T;
  };

  const waitForStyleReady = async () => {
    if (!map) return;
    if (map.isStyleLoaded?.()) {
      return;
    }
    await new Promise<void>((resolve) => {
      map?.once('load', () => resolve());
    });
  };

  const getFirstForegroundLayerId = (): string | null => {
    if (!map?.getStyle) return null;
    const style = map.getStyle();
    if (!style?.layers) return null;
    for (const layer of style.layers as Array<{ id?: string }>) {
      if (layer?.id && !basemapLayerIds.has(layer.id)) {
        return layer.id;
      }
    }
    return null;
  };

  const loadBasemapStyle = async (id: BasemapId): Promise<StyleSpecification> => {
    const cached = basemapStyles.get(id);
    if (cached) {
      return cached;
    }
    const pending = styleSpecificationPromises.get(id);
    if (pending) {
      return pending;
    }
    const config = basemapConfigs[id];
    if (!config) {
      throw new Error(`No basemap configuration found for "${id}".`);
    }

    const promise = (async () => {
      const styleDefinition = config.style;
      let specification: StyleSpecification;
      if (typeof styleDefinition === 'string') {
        const response = await fetch(styleDefinition);
        if (!response.ok) {
          throw new Error(
            `Failed to load style for basemap "${id}" (status ${response.status}).`
          );
        }
        const json = (await response.json()) as StyleSpecification;
        specification = normaliseStyleSpecification(json, styleDefinition);
      } else {
        specification = normaliseStyleSpecification(styleDefinition);
      }
      basemapStyles.set(id, specification);
      return specification;
    })();

    styleSpecificationPromises.set(id, promise);
    promise.finally(() => {
      styleSpecificationPromises.delete(id);
    });
    return promise;
  };

  const ensurePreparedBasemap = async (
    id: BasemapId,
    { visible }: { visible: boolean }
  ): Promise<PreparedBasemapStyle> => {
    const existing = preparedBasemaps.get(id);
    if (existing) {
      return existing;
    }
    const specification = await loadBasemapStyle(id);
    const prepared = prepareBasemapStyle(id, specification, { visible });
    preparedBasemaps.set(id, prepared);
    prepared.layerIds.forEach((layerId) => basemapLayerIds.add(layerId));
    return prepared;
  };

  const ensureBasemapLayersAttached = async (
    id: BasemapId,
    { visible }: { visible: boolean }
  ): Promise<PreparedBasemapStyle> => {
    const prepared = await ensurePreparedBasemap(id, { visible });
    if (!map) {
      return prepared;
    }

    await waitForStyleReady();

    for (const [sourceId, source] of Object.entries(prepared.sources)) {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, source as any);
      }
    }

    const beforeId = getFirstForegroundLayerId();
    for (const layer of prepared.layers) {
      if (!map.getLayer(layer.id)) {
        map.addLayer(cloneLayerSpecification(layer) as any, beforeId ?? undefined);
      }
    }

    return prepared;
  };

  const setBasemapVisibility = (id: BasemapId, visible: boolean) => {
    if (!map) return;
    const prepared = preparedBasemaps.get(id);
    if (!prepared) return;

    for (const layerId of prepared.layerIds) {
      if (!map.getLayer(layerId)) continue;
      const desired = visible ? prepared.visibility[layerId] ?? 'visible' : 'none';
      map.setLayoutProperty(layerId, 'visibility', desired as never);
    }

    if (visible) {
      if (prepared.sprite !== currentSprite) {
        map.setSprite(prepared.sprite ?? null);
        currentSprite = prepared.sprite ?? null;
      }
      if (prepared.glyphs !== currentGlyphs) {
        map.setGlyphs(prepared.glyphs ?? null);
        currentGlyphs = prepared.glyphs ?? null;
      }
    }
  };

  const activateBasemap = async (nextBasemap: BasemapId) => {
    const requestToken = ++basemapChangeToken;
    try {
      await ensureBasemapLayersAttached(nextBasemap, { visible: false });
      if (disposed || !map || requestToken !== basemapChangeToken) {
        return;
      }

      const previous = currentBasemap;
      if (previous && previous !== nextBasemap) {
        setBasemapVisibility(previous, false);
      }

      setBasemapVisibility(nextBasemap, true);
      currentBasemap = nextBasemap;
    } catch (error) {
      if (!disposed) {
        console.error('MapView: failed to activate basemap', {
          basemapId: nextBasemap,
          error
        });
      }
    }
  };

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
    if (map.isStyleLoaded?.()) {
      syncPmtilesLayers({
        map,
        pmtilesLayers: resolvePmtilesLayers(),
        attachedLayerIds,
        layerStates,
        getSourceId,
        prepareSource: preparePmtilesSource,
        logger: console
      });
      return;
    }

    if (!pendingSync) {
      pendingSync = true;
      map.once('load', () => {
        pendingSync = false;
        syncPmtilesLayers({
          map: map!,
          pmtilesLayers: resolvePmtilesLayers(),
          attachedLayerIds,
          layerStates,
          getSourceId,
          prepareSource: preparePmtilesSource,
          logger: console
        });
      });
    }
  };

  onMount(() => {
    if (!container) return;

    (async () => {
      try {
        const stylePromise = loadBasemapStyle(basemap);
        const [maplibre, pmtilesModule] = await Promise.all([
          import('maplibre-gl'),
          import('pmtiles')
        ]);
        await stylePromise;

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

        basemapLayerIds.clear();
        const initialPrepared = await ensurePreparedBasemap(basemap, { visible: true });
        basemapLayerIds.add(baseBackgroundLayerId);
        initialPrepared.layerIds.forEach((layerId) => basemapLayerIds.add(layerId));

        const baseStyle: StyleSpecification = {
          version: 8,
          name: 'Composite basemap style',
          glyphs: initialPrepared.glyphs ?? undefined,
          sprite: initialPrepared.sprite ?? undefined,
          sources: {},
          layers: [
            {
              id: baseBackgroundLayerId,
              type: 'background',
              paint: {
                'background-color': '#ffffff'
              }
            }
          ]
        };

        mergePreparedBasemapIntoStyle(baseStyle, initialPrepared);

        map = new MapConstructor({
          container,
          style: baseStyle as any,
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
        currentSprite = initialPrepared.sprite ?? null;
        currentGlyphs = initialPrepared.glyphs ?? null;

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

  $: if (map && basemap && basemap !== currentBasemap) {
    void activateBasemap(basemap);
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
