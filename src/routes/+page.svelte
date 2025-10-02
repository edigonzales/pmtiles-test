<script lang="ts">
  import { ComboBox } from 'carbon-components-svelte';
  import MapView from '$lib/components/MapView.svelte';
  import { basemapOptions, type BasemapId } from '$lib/basemaps';
  import type { PMTilesLayerConfig } from '$lib/types/pmtiles';

  type MapReadyEvent = CustomEvent<import('maplibre-gl').Map>;
  type BasemapOption = (typeof basemapOptions)[number];
  type BasemapComboBoxItem = BasemapOption & { text: string };

  if (!basemapOptions.length) {
    throw new Error('No basemap options configured.');
  }

  const basemapItems: BasemapComboBoxItem[] = basemapOptions.map((option) => ({
    ...option,
    text: option.label
  }));

  const initialBasemap =
    basemapItems.find((option) => option.id === 'swisstopo') ?? basemapItems[0];

  let mapLoaded = false;
  let pmtilesLayers: PMTilesLayerConfig[] = [];
  let selectedId: BasemapId = (initialBasemap?.id ?? basemapItems[0].id) as BasemapId;
  let selectedItem: BasemapComboBoxItem = initialBasemap ?? basemapItems[0];
  let selectedBasemap: BasemapId = selectedItem.id as BasemapId;

  const handleReady = (_event: MapReadyEvent) => {
    mapLoaded = true;
  };

  $: selectedItem =
    basemapItems.find((item) => item.id === selectedId) ?? basemapItems[0];
  $: selectedBasemap = selectedItem.id as BasemapId;
</script>

<div class="map-page">
  <MapView basemap={selectedBasemap} pmtilesLayers={pmtilesLayers} on:ready={handleReady} />

  <div class="basemap-switcher">
    <ComboBox
      id="basemap-switcher"
      class="combo-box"
      hideLabel
      titleText="Basemap"
      placeholder="Choose a basemap"
      items={basemapItems}
      itemToString={(item) => (item ? item.text : '')}
      helperText={selectedItem.description}
      bind:selectedId={selectedId}
    />
  </div>

  <p class="map-status" data-testid="map-status">
    {mapLoaded ? 'Map initialised' : 'Initialising map...'}
  </p>
</div>

<style>
  .map-page {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
  }

  .map-page :global(.map),
  .map-page :global(.map-error) {
    flex: 1 1 auto;
    height: 100%;
  }

  .basemap-switcher {
    position: absolute;
    top: clamp(1rem, 4vw, 2.5rem);
    left: 50%;
    transform: translateX(-50%);
    width: min(90vw, 22rem);
    padding: 0.5rem 0.75rem 0.75rem;
    background: var(--cds-layer, #fff);
    border: 1px solid var(--cds-border-subtle, #e0e0e0);
    border-radius: 0;
  }

  .basemap-switcher :global(.combo-box) {
    width: 100%;
  }

  .map-status {
    position: absolute;
    bottom: clamp(1rem, 4vw, 2.5rem);
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 0.5rem 0.75rem;
    border-radius: 999px;
    background: rgba(22, 22, 22, 0.7);
    color: #fff;
    font-size: 0.875rem;
    letter-spacing: 0.01em;
    box-shadow: 0 0.5rem 1.5rem rgba(22, 22, 22, 0.25);
    backdrop-filter: blur(6px);
  }

  @media (max-width: 480px) {
    .basemap-switcher {
      padding: 0.5rem 0.5rem 0.65rem;
      backdrop-filter: blur(4px);
    }

    .map-status {
      font-size: 0.75rem;
      padding: 0.4rem 0.6rem;
    }
  }
</style>
