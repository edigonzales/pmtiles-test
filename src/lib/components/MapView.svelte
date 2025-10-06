<script lang="ts" context="module">
  export type { LayerType, PMTilesLayerConfig } from '$lib/types/pmtiles';
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { basemapConfigs, type BasemapId } from '$lib/basemaps';
  import { syncPmtilesLayers, type LayerState } from './pmtilesSynchroniser';
  import type { Map as MaplibreMap } from 'maplibre-gl';
  import type { PMTilesLayerConfig } from '$lib/types/pmtiles';

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
  const attachedLayerIds = new Set<string>();
  const layerStates = new Map<string, LayerState>();
  let pendingSync = false;
  let disposed = false;
  let loadError: string | null = null;
  let registerProtocol: ((name: string, handler: any) => void) | null = null;
  let unregisterProtocol: ((name: string) => void) | null = null;
  let protocolRegistered = false;

  const getSourceId = (layerId: string) => `${layerId}-source`;

  const scheduleSync = () => {
    if (!map) return;
    if (map.isStyleLoaded?.()) {
      syncPmtilesLayers({
        map,
        pmtilesLayers,
        attachedLayerIds,
        layerStates,
        getSourceId,
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
          pmtilesLayers,
          attachedLayerIds,
          layerStates,
          getSourceId,
          logger: console
        });
      });
    }
  };

  onMount(() => {
    if (!container) return;

    (async () => {
      try {
        const [maplibre, { Protocol }] = await Promise.all([
          import('maplibre-gl'),
          import('pmtiles')
        ]);

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
      if (protocolRegistered && unregisterProtocol && pmtilesProtocol) {
        unregisterProtocol('pmtiles');
        protocolRegistered = false;
        console.debug('MapView: removed PMTiles protocol registration');
      }
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
    map.once('load', () => {
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
