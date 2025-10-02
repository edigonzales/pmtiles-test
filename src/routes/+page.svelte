<script lang="ts">
  import { Content, Grid, Column, Tile, Select, SelectItem, InlineNotification } from 'carbon-components-svelte';
  import MapView from '$lib/components/MapView.svelte';
  import { basemapOptions, type BasemapId } from '$lib/basemaps';
  import type { PMTilesLayerConfig } from '$lib/types/pmtiles';

  type MapReadyEvent = CustomEvent<import('maplibre-gl').Map>;

  let mapLoaded = false;

  // Configure your PMTiles layers here. By default no PMTiles are loaded.
  let pmtilesLayers: PMTilesLayerConfig[] = [];

  let selectedBasemap: BasemapId = 'osm';

  const handleReady = (_event: MapReadyEvent) => {
    mapLoaded = true;
  };
</script>

<Content>
  <div class="page">
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <div class="control-panel">
          <Tile>
            <div class="tile-content">
              <h1 class="heading">PMTiles MapLibre starter</h1>
              <p class="body">Select a basemap and plug in your PMTiles sources to get started.</p>
              <Select id="basemap-select" labelText="Basemap" bind:selected={selectedBasemap}>
                {#each basemapOptions as option}
                  <SelectItem value={option.id} text={option.label} />
                {/each}
              </Select>
              <p class="helper-text">
                {basemapOptions.find((option) => option.id === selectedBasemap)?.description}
              </p>
              <InlineNotification
                kind="info"
                title="Add your PMTiles"
                subtitle="Update the pmtilesLayers array in +page.svelte to register your tile sources and layers."
                hideCloseButton
              />
              <p class="status" data-testid="map-status">
                {mapLoaded ? 'Map initialised' : 'Initialising map...'}
              </p>
            </div>
          </Tile>
        </div>
      </Column>
      <Column sm={4} md={8} lg={16}>
        <div class="map-container">
          <MapView basemap={selectedBasemap} pmtilesLayers={pmtilesLayers} on:ready={handleReady} />
        </div>
      </Column>
    </Grid>
  </div>
</Content>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-top: 2rem;
    padding-bottom: 2rem;
  }

  .control-panel {
    display: flex;
  }

  .tile-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .heading {
    margin: 0;
  }

  .body {
    margin: 0;
  }

  .helper-text {
    margin: 0;
    color: var(--cds-text-helper, #6f6f6f);
  }

  .status {
    margin: 0;
    font-weight: 600;
  }

  .map-container {
    min-height: 70vh;
  }
</style>
