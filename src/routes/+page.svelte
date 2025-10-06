<script lang="ts">
  import {
    Button,
    Checkbox,
    ComboBox,
    InlineLoading,
    Modal,
    Search,
    Tag,
    Tile
  } from 'carbon-components-svelte';
  import MapView from '$lib/components/MapView.svelte';
  import { basemapOptions, type BasemapId } from '$lib/basemaps';
  import type { PMTilesLayerConfig } from '$lib/types/pmtiles';
  import type {
    DatasetSearchResult,
    DatasetMetadata,
    SelectedDatasetState,
    DatasetVersion
  } from '$lib/types/dataset';
  import { searchDatasets } from '$lib/services/datasetSearch';
  import AddAlt from 'carbon-icons-svelte/lib/AddAlt.svelte';
  import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';

  type BasemapOption = (typeof basemapOptions)[number];
  type BasemapComboBoxItem = BasemapOption & { text: string };
  type ComboBoxSelectDetail = {
    selectedId?: string | null;
    selectedItem?: { id?: string | null } | null;
  };

  if (!basemapOptions.length) {
    throw new Error('No basemap options configured.');
  }

  const basemapItems: BasemapComboBoxItem[] = basemapOptions.map((option) => ({
    ...option,
    text: option.label
  }));

  const initialBasemap =
    basemapItems.find((option) => option.id === 'swisstopo') ?? basemapItems[0];

  const dateFormatter = new Intl.DateTimeFormat('de-CH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  let pmtilesLayers: PMTilesLayerConfig[] = [];
  let selectedId: BasemapId = (initialBasemap?.id ?? basemapItems[0].id) as BasemapId;
  let selectedItem: BasemapComboBoxItem = initialBasemap ?? basemapItems[0];
  let selectedBasemap: BasemapId = selectedItem.id as BasemapId;

  let searchTerm = '';
  let searching = false;
  let searchPerformed = false;
  let searchError: string | null = null;
  let searchResults: DatasetSearchResult[] = [];
  let selectedDatasets: SelectedDatasetState[] = [];

  let timelineModalOpen = false;
  let timelineDatasetId: string | null = null;
  let timelineInstanceId: string | null = null;
  let expandedResultState: Record<string, boolean> = {};
  let expandedTocState: Record<string, boolean> = {};
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;
  let searchRequestId = 0;

  const generateInstanceId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `dataset-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const resetSearchState = (cancelOngoing = false) => {
    if (cancelOngoing) {
      searchRequestId += 1;
    }
    searchResults = [];
    expandedResultState = {};
    searchError = null;
    searchPerformed = false;
  };

  const performSearch = async (term: string) => {
    const trimmed = term.trim();

    if (!trimmed) {
      resetSearchState(true);
      searching = false;
      return;
    }

    const requestId = ++searchRequestId;
    searching = true;
    searchError = null;

    try {
      const results = await searchDatasets(trimmed);
      if (requestId !== searchRequestId) {
        return;
      }
      searchResults = results;
      expandedResultState = {};
      searchPerformed = true;
    } catch (error) {
      console.error('Failed to search datasets', error);
      if (requestId === searchRequestId) {
        searchError = 'The search service is currently unavailable.';
        searchPerformed = false;
      }
    } finally {
      if (requestId === searchRequestId) {
        searching = false;
      }
    }
  };

  const queueSearch = (term: string) => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
      searchDebounce = null;
    }

    if (!term.trim()) {
      resetSearchState(true);
      searching = false;
      return;
    }

    searchDebounce = setTimeout(() => {
      void performSearch(term);
    }, 250);
  };

  const handleSearchInput = () => {
    queueSearch(searchTerm);
  };

  const handleSearchClear = () => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
      searchDebounce = null;
    }
    searchTerm = '';
    resetSearchState(true);
    searching = false;
  };

  const handleSearchSubmit = async (event: Event) => {
    event.preventDefault();
    if (searchDebounce) {
      clearTimeout(searchDebounce);
      searchDebounce = null;
    }
    await performSearch(searchTerm);
  };

  const datasetAlreadyAdded = (dataset: DatasetMetadata) =>
    selectedDatasets.some((entry) => entry.dataset.id === dataset.id);

  const handleStyleSelect = (instanceId: string) => (
    event: CustomEvent<ComboBoxSelectDetail>
  ) => {
    const nextId =
      event.detail.selectedId ?? event.detail.selectedItem?.id ?? undefined;
    if (nextId) {
      changeStyle(instanceId, nextId);
    }
  };

  const addDataset = (dataset: DatasetMetadata) => {
    const instanceId = generateInstanceId();
    selectedDatasets = [
      ...selectedDatasets,
      {
        instanceId,
        dataset,
        activeStyleId: dataset.defaultStyleId,
        activeVersionId: dataset.defaultVersionId,
        visible: true
      }
    ];
    expandedTocState = { ...expandedTocState, [instanceId]: true };
  };

  const removeDataset = (instanceId: string) => {
    const removedEntry = selectedDatasets.find((entry) => entry.instanceId === instanceId);
    selectedDatasets = selectedDatasets.filter((entry) => entry.instanceId !== instanceId);
    const { [instanceId]: _removed, ...remainingExpanded } = expandedTocState;
    expandedTocState = remainingExpanded;
    if (timelineInstanceId === instanceId) {
      timelineInstanceId = null;
      timelineDatasetId = null;
      timelineModalOpen = false;
    } else if (
      timelineDatasetId &&
      removedEntry?.dataset.id === timelineDatasetId &&
      !selectedDatasets.some((entry) => entry.dataset.id === timelineDatasetId)
    ) {
      timelineDatasetId = null;
      timelineModalOpen = false;
    }
  };

  const changeStyle = (instanceId: string, styleId: string) => {
    selectedDatasets = selectedDatasets.map((entry) =>
      entry.instanceId === instanceId ? { ...entry, activeStyleId: styleId } : entry
    );
  };

  const changeVersion = (instanceId: string, versionId: string) => {
    selectedDatasets = selectedDatasets.map((entry) =>
      entry.instanceId === instanceId ? { ...entry, activeVersionId: versionId } : entry
    );
  };

  const setDatasetVisibility = (instanceId: string, visible: boolean) => {
    selectedDatasets = selectedDatasets.map((entry) =>
      entry.instanceId === instanceId ? { ...entry, visible } : entry
    );
  };

  const toggleTocExpanded = (instanceId: string) => {
    const nextExpanded = !(expandedTocState[instanceId] ?? true);

    expandedTocState = { ...expandedTocState, [instanceId]: nextExpanded };
  };

  const openTimeline = (datasetId: string, instanceId: string | null = null) => {
    timelineDatasetId = datasetId;
    timelineInstanceId = instanceId;
    timelineModalOpen = true;
  };

  const closeTimeline = () => {
    timelineModalOpen = false;
    timelineDatasetId = null;
    timelineInstanceId = null;
  };

  const getDatasetVersion = (dataset: DatasetMetadata, versionId: string) =>
    dataset.versions.find((version) => version.id === versionId);

  const getLatestVersion = (dataset: DatasetMetadata) => dataset.versions[0] ?? null;

  const toggleResultExpanded = (datasetId: string) => {
    const nextExpanded = !(expandedResultState[datasetId] ?? false);

    console.log('dataset-result: toggle', {
      datasetId,
      expanded: nextExpanded
    });

    expandedResultState = { ...expandedResultState, [datasetId]: nextExpanded };
  };

  const formatVersionRange = (version: DatasetVersion) => {
    if (version.effectiveFrom && version.effectiveTo) {
      return `${dateFormatter.format(new Date(version.effectiveFrom))} – ${dateFormatter.format(
        new Date(version.effectiveTo)
      )}`;
    }

    if (version.effectiveFrom) {
      return `Since ${dateFormatter.format(new Date(version.effectiveFrom))}`;
    }

    return 'Effective date unknown';
  };

  $: selectedItem = basemapItems.find((item) => item.id === selectedId) ?? basemapItems[0];
  $: selectedBasemap = selectedItem.id as BasemapId;

  $: pmtilesLayers = selectedDatasets.flatMap((entry) => {
    if (!entry.visible) {
      return [];
    }

    const style = entry.dataset.styles.find((item) => item.id === entry.activeStyleId);
    const version = getDatasetVersion(entry.dataset, entry.activeVersionId);
    if (!style || !version) {
      return [];
    }

    return [
      {
        id: entry.instanceId,
        url: version.url,
        layerType: style.layerTypeOverride ?? entry.dataset.mapConfig.layerType,
        sourceType: entry.dataset.mapConfig.sourceType,
        sourceLayer: entry.dataset.mapConfig.sourceLayer,
        paint: style.paint,
        layout: style.layout,
        minzoom: entry.dataset.mapConfig.minzoom,
        maxzoom: entry.dataset.mapConfig.maxzoom
      }
    ];
  });

  $: timelineSelection = timelineDatasetId
    ? timelineInstanceId
      ? selectedDatasets.find((entry) => entry.instanceId === timelineInstanceId) ?? null
      : selectedDatasets.find((entry) => entry.dataset.id === timelineDatasetId) ?? null
    : null;
</script>

<div class="page">
  <main class="map-area">
    <MapView basemap={selectedBasemap} pmtilesLayers={pmtilesLayers} />

    <div class="map-overlays">
      <div class="map-overlays__bottom">
        <div class="map-overlays__panel">
          <ComboBox
            id="basemap-switcher"
            class="combo-box"
            hideLabel
            titleText="Basemap"
            direction="top"
            placeholder="Choose a basemap"
            items={basemapItems}
            itemToString={(item) => (item ? item.text : '')}
            bind:selectedId={selectedId}
          />
          <!-- helperText={selectedItem.description} -->
        </div>
      </div>
    </div>
  </main>

  <aside class="overlay overlay--search" aria-label="Dataset search panel">
    <section class="panel">
      <header class="panel__header">
        <h1>PMTiles data catalogue</h1>
        <p>Search authoritative vector datasets and add them to the interactive map.</p>
      </header>

      <form class="search-form" on:submit|preventDefault={handleSearchSubmit}>
        <Search
          id="dataset-search"
          size="lg"
          labelText="Search datasets"
          placeholder="Search by title, theme, keyword..."
          bind:value={searchTerm}
          on:input={handleSearchInput}
          on:clear={handleSearchClear}
        />
      </form>

      {#if searching}
        <div class="search-status" role="status">
          <InlineLoading description="Searching datasets..." />
        </div>
      {/if}

      {#if searchError}
        <p class="search-error" role="alert">{searchError}</p>
      {/if}

      {#if searchResults.length}
        <div class="results-list" aria-live="polite">
          {#each searchResults as result (result.dataset.id)}
            {@const expanded = !!expandedResultState[result.dataset.id]}
            {@const alreadyAdded = datasetAlreadyAdded(result.dataset)}
            <Tile class="result-card">
              <div class="result-card__collapse" data-dataset-id={result.dataset.id}>
                <div class="result-card__header">
                  <button
                    type="button"
                    class="result-card__toggle"
                    aria-expanded={expanded}
                    aria-controls={`result-details-${result.dataset.id}`}
                    on:click={() => toggleResultExpanded(result.dataset.id)}
                  >
                    <span class="result-card__title" role="heading" aria-level="2">
                      {result.dataset.title}
                    </span>
                    <svg
                      class="result-card__chevron"
                      class:result-card__chevron--expanded={expanded}
                      aria-hidden="true"
                      focusable="false"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.41 5.59 12 4.17 8 8.17l-4-4-1.41 1.42L8 11l5.41-5.41Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="result-card__add"
                    aria-label={alreadyAdded ? 'Add another version to map' : 'Add to map'}
                    title={alreadyAdded ? 'Add another version to map' : 'Add to map'}
                    on:click|stopPropagation={() => addDataset(result.dataset)}
                  >
                    <AddAlt
                      size={20}
                      class="result-card__add-icon"
                      aria-hidden="true"
                      focusable="false"
                    />
                  </button>
                </div>

                {#if expanded}
                  {@const latestVersion = getLatestVersion(result.dataset)}
                  <div
                    class="result-card__details"
                    id={`result-details-${result.dataset.id}`}
                  >
                    <div class="result-card__tags">
                      <Tag type="cool-gray" size="sm">{result.dataset.theme}</Tag>
                      <Tag type="teal" size="sm">{result.dataset.geometryType}</Tag>
                    </div>
                    <div class="result-card__meta">
                      <div class="result-card__provider">{result.dataset.provider}</div>
                    </div>
                    <p class="result-card__description">{result.dataset.description}</p>
                    <div class="result-card__info-grid">
                      <dl class="result-card__definition-list">
                        <div>
                          <dt>Default style</dt>
                          <dd>
                            {result.dataset.styles.find((style) => style.id === result.dataset.defaultStyleId)?.label}
                          </dd>
                        </div>
                        <div>
                          <dt>Default version</dt>
                          <dd>
                            {result.dataset.versions.find((version) => version.id === result.dataset.defaultVersionId)?.label}
                          </dd>
                        </div>
                      </dl>
                      <div class="result-card__keywords">
                        <h3>Keywords</h3>
                        <div class="result-card__keyword-tags">
                          {#each result.dataset.keywords as keyword}
                            <Tag type="purple" size="sm">{keyword}</Tag>
                          {/each}
                        </div>
                        {#if result.matches.length}
                          <div class="result-card__matches" aria-label="Search matches">
                            {#each result.matches as match}
                              <Tag type="blue" size="sm">{match}</Tag>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                    <div class="result-card__styles">
                      <h3>Available styles</h3>
                      <ul>
                        {#each result.dataset.styles as style}
                          <li>
                            <div class="result-card__style-header">
                              <span class="result-card__style-title">{style.label}</span>
                              {#if style.id === result.dataset.defaultStyleId}
                                <Tag type="green" size="sm">Default</Tag>
                              {/if}
                            </div>
                            <p>{style.description}</p>
                          </li>
                        {/each}
                      </ul>
                    </div>
                    <div class="result-card__latest-version">
                      <h3>Latest version</h3>
                      {#if latestVersion}
                        <div class="result-card__latest-version-meta">
                          <span>{latestVersion.label}</span>
                          <span>{formatVersionRange(latestVersion)}</span>
                        </div>
                        <p>{latestVersion.summary}</p>
                      {:else}
                        <p>No version history available.</p>
                      {/if}
                    </div>
                    <div class="result-card__actions">
                      <Button
                        kind="primary"
                        size="small"
                        on:click={() => addDataset(result.dataset)}
                      >
                        {alreadyAdded ? 'Add another version' : 'Add to map'}
                      </Button>
                      <Button
                        kind="ghost"
                        size="small"
                        on:click={() => openTimeline(result.dataset.id)}
                      >
                        View versions
                      </Button>
                    </div>
                  </div>
                {/if}
              </div>
            </Tile>
          {/each}
        </div>
      {:else if searchPerformed && !searching}
        <p class="search-empty">No datasets matched your search. Try another keyword.</p>
      {/if}
    </section>
  </aside>

  <aside class="overlay overlay--toc" aria-label="Table of contents">
    <section class="panel">
      <header class="panel__header">
        <h2>Table of contents</h2>
        <p>Manage the datasets currently shown on the map.</p>
      </header>

      {#if selectedDatasets.length === 0}
        <p class="empty-state">No datasets added yet. Use the search to add layers.</p>
      {:else}
        <div class="toc-list">
          {#each selectedDatasets as entry (entry.instanceId)}
            {#key `${entry.instanceId}-${entry.activeStyleId}-${entry.activeVersionId}`}
              {@const expanded = expandedTocState[entry.instanceId] ?? true}
              {@const detailsId = `toc-details-${entry.instanceId}`}
              {@const activeVersion = getDatasetVersion(entry.dataset, entry.activeVersionId)}
              <Tile class="toc-card">
                <div class="toc-card__collapse" data-instance-id={entry.instanceId}>
                  <div class="toc-card__header">
                    <Checkbox
                      class="toc-card__visibility"
                      checked={entry.visible}
                      hideLabel
                      labelText={`Toggle ${entry.dataset.title} visibility`}
                      on:check={(event) => setDatasetVisibility(entry.instanceId, event.detail)}
                    />
                    <button
                      type="button"
                      class="toc-card__toggle"
                      aria-expanded={expanded}
                      aria-controls={detailsId}
                      on:click={() => toggleTocExpanded(entry.instanceId)}
                    >
                      <span class="toc-card__title-group" role="heading" aria-level="2">
                        <span class="toc-card__title">{entry.dataset.title}</span>
                      </span>
                      <svg
                        class="toc-card__chevron"
                        class:toc-card__chevron--expanded={expanded}
                        aria-hidden="true"
                        focusable="false"
                        viewBox="0 0 16 16"
                      >
                        <path d="M13.41 5.59 12 4.17 8 8.17l-4-4-1.41 1.42L8 11l5.41-5.41Z" />
                      </svg>
                    </button>
                    <Button
                      class="toc-card__remove"
                      kind="ghost"
                      size="small"
                      iconDescription="Remove dataset"
                      on:click={(event) => {
                        event.stopPropagation();
                        removeDataset(entry.instanceId);
                      }}
                    >
                      <svelte:fragment slot="icon">
                        <TrashCan size={20} aria-hidden="true" focusable="false" />
                      </svelte:fragment>
                    </Button>
                  </div>

                  {#if expanded}
                    <div class="toc-card__details" id={detailsId}>
                      <p class="toc-card__summary">{entry.dataset.summary}</p>
                      <div class="toc-card__tags">
                        <Tag type="cool-gray" size="sm">{entry.dataset.theme}</Tag>
                        <Tag type="purple" size="sm">{entry.dataset.geometryType}</Tag>
                      </div>
                      <div class="toc-card__controls">
                        <ComboBox
                          id={`style-${entry.instanceId}`}
                          class="style-combobox"
                          titleText="Style"
                          hideLabel
                          helperText={
                            entry.dataset.styles.find((style) => style.id === entry.activeStyleId)?.description
                          }
                          items={entry.dataset.styles.map((style) => ({
                            id: style.id,
                            text: style.label
                          }))}
                          selectedId={entry.activeStyleId}
                          itemToString={(item) => (item ? item.text : '')}
                          on:select={handleStyleSelect(entry.instanceId)}
                        />
                        <Button
                          kind="tertiary"
                          size="small"
                          on:click={() => openTimeline(entry.dataset.id, entry.instanceId)}
                        >
                          Version timeline
                        </Button>
                      </div>
                      {#if activeVersion}
                        <div class="toc-card__version">
                          <span class="toc-card__version-label">{activeVersion.label}</span>
                          <span class="toc-card__version-range">{formatVersionRange(activeVersion)}</span>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              </Tile>
            {/key}
          {/each}
        </div>
      {/if}
    </section>
  </aside>
</div>

<Modal
  size="lg"
  open={timelineModalOpen}
  modalHeading={timelineSelection ? `Version history – ${timelineSelection.dataset.title}` : 'Version history'}
  modalLabel="Dataset versions"
  on:close={closeTimeline}
  passiveModal
  hasScrollingContent
>
  {#if timelineSelection}
    <div class="timeline-list">
      {#each timelineSelection.dataset.versions as version}
        <button
          type="button"
          class:timeline-list__item--active={timelineSelection.activeVersionId === version.id}
          class="timeline-list__item"
          on:click={() => {
            changeVersion(timelineSelection.instanceId, version.id);
            closeTimeline();
          }}
        >
          <div class="timeline-list__item-header">
            <h3>{version.label}</h3>
            {#if timelineSelection.activeVersionId === version.id}
              <Tag type="green" size="sm">Active</Tag>
            {/if}
          </div>
          <p class="timeline-list__range">{formatVersionRange(version)}</p>
          <p class="timeline-list__summary">{version.summary}</p>
          {#if version.changes?.length}
            <ul class="timeline-list__changes">
              {#each version.changes as change}
                <li>{change}</li>
              {/each}
            </ul>
          {/if}
        </button>
      {/each}
    </div>
  {:else}
    <p>No dataset selected.</p>
  {/if}
</Modal>

<style>
  .page {
    --page-gap: clamp(0.5rem, 1.5vw, 1.25rem);
    position: relative;
    width: 100vw;
    height: 100vh;
    background: var(--cds-ui-background, #f4f4f4);
    overflow: hidden;
    color: var(--cds-text-primary, #161616);
  }

  :global(body) {
    margin: 0;
    background: var(--cds-ui-background, #f4f4f4);
    font-family: 'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .map-area {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .map-area :global(.map) {
    width: 100%;
    height: 100%;
  }

  .overlay {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: clamp(1.25rem, 2.5vw, 1.75rem);
    width: min(26rem, calc(100vw - 2 * var(--page-gap)));
    max-height: calc(100vh - 2 * var(--page-gap));
    background: var(--cds-layer, rgba(255, 255, 255, 0.94));
    border-radius: 0.75rem;
    box-shadow: 0 1.5rem 3.5rem rgba(22, 22, 22, 0.18);
    backdrop-filter: blur(10px);
    overflow-y: auto;
    z-index: 2;
    transform: none;
  }

  .overlay--search {
    top: var(--page-gap);
    left: var(--page-gap);
  }

  .overlay--toc {
    top: var(--page-gap);
    right: var(--page-gap);
  }

  @media (max-width: 1200px) {
    .overlay--toc {
      top: auto;
      bottom: var(--page-gap);
    }
  }

  @media (max-width: 960px) {
    .overlay {
      left: 50%;
      right: auto;
      transform: translateX(-50%);
      width: min(32rem, calc(100vw - 2 * var(--page-gap)));
    }

    .overlay--search {
      top: var(--page-gap);
    }

    .overlay--toc {
      top: auto;
      bottom: var(--page-gap);
    }
  }

  @media (max-width: 640px) {
    .overlay {
      width: calc(100vw - 2 * var(--page-gap));
      max-height: calc(100vh - 2 * var(--page-gap));
    }
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel__header h1,
  .panel__header h2 {
    margin: 0 0 0.25rem;
    font-size: 1.25rem;
    line-height: 1.4;
  }

  .panel__header p {
    margin: 0;
    color: var(--cds-text-secondary, #525252);
  }

  .search-form {
    display: block;
  }

  .search-form :global(.cds--search) {
    width: 100%;
  }

  .search-status {
    display: flex;
    justify-content: center;
    padding: 0.5rem 0;
  }

  .search-error {
    margin: 0;
    color: var(--cds-text-error, #da1e28);
    font-weight: 600;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  :global(.result-card) {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .result-card__collapse {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
  }

  .result-card__header {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .result-card__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex: 1;
    width: 100%;
    padding: 0;
    cursor: pointer;
    text-align: left;
    color: inherit;
    border: none;
    background: transparent;
    list-style: none;
  }

  .result-card__toggle:focus-visible {
    outline: 2px solid var(--cds-focus, #0f62fe);
    outline-offset: 2px;
    border-radius: 0.25rem;
  }

  .result-card__toggle::marker,
  .result-card__toggle::-webkit-details-marker {
    display: none;
  }

  .result-card__add {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--cds-interactive, #0f62fe);
    cursor: pointer;
  }

  .result-card__add:hover:not(:disabled) {
    background: rgba(15, 98, 254, 0.1);
  }

  .result-card__add:focus-visible {
    outline: 2px solid var(--cds-focus, #0f62fe);
    outline-offset: 2px;
  }

  .result-card__add:disabled {
    color: var(--cds-text-disabled, #c6c6c6);
    cursor: not-allowed;
  }

  .result-card__title {
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .result-card__chevron {
    width: 0.75rem;
    height: 0.75rem;
    flex-shrink: 0;
    display: block;
    fill: currentColor;
    transition: transform 0.2s ease;
  }

  .result-card__chevron--expanded {
    transform: rotate(180deg);
  }

  .result-card__details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .result-card__tags {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.35rem;
  }

  .result-card__meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    color: var(--cds-text-helper, #6f6f6f);
  }

  .result-card__provider {
    font-weight: 600;
    color: var(--cds-text-primary, #161616);
  }

  .result-card__description {
    margin: 0;
    color: var(--cds-text-secondary, #525252);
  }

  .result-card__info-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .result-card__definition-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.75rem;
    margin: 0;
  }

  .result-card__definition-list div {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .result-card__definition-list dt {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--cds-text-helper, #6f6f6f);
  }

  .result-card__definition-list dd {
    margin: 0;
    font-weight: 600;
    color: var(--cds-text-primary, #161616);
  }

  .result-card__keywords {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .result-card__keywords h3,
  .result-card__styles h3,
  .result-card__latest-version h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  .result-card__keyword-tags,
  .result-card__matches {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .result-card__styles ul {
    margin: 0;
    padding-left: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    list-style: none;
  }

  .result-card__styles li {
    list-style: none;
    border-left: 2px solid var(--cds-border-strong-01, #8d8d8d);
    padding-left: 0.75rem;
  }

  .result-card__style-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .result-card__style-title {
    color: var(--cds-text-primary, #161616);
  }

  .result-card__styles p {
    margin: 0.25rem 0 0;
    color: var(--cds-text-secondary, #525252);
  }

  .result-card__latest-version {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .result-card__latest-version-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--cds-text-primary, #161616);
  }

  .result-card__latest-version p {
    margin: 0;
    color: var(--cds-text-secondary, #525252);
  }

  .result-card__actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .search-empty,
  .empty-state {
    margin: 0;
    color: var(--cds-text-secondary, #525252);
  }

  .toc-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  :global(.toc-card) {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .toc-card__collapse {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .toc-card__header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.toc-card__visibility) {
    margin: 0;
    width: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .toc-card__header :global(.bx--checkbox-wrapper) {
    width: auto;
  }

  .toc-card__header :global(.bx--form-item) {
    margin-bottom: 0;
  }

  .toc-card__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    background: none;
    border: none;
    padding: 0.25rem 0;
    text-align: left;
    cursor: pointer;
    color: inherit;
    width: 100%;
  }

  .toc-card__toggle:focus-visible {
    outline: 2px solid var(--cds-focus, #0f62fe);
    outline-offset: 2px;
  }

  .toc-card__title-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .toc-card__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--cds-text-primary, #161616);
  }

  .toc-card__chevron {
    width: 0.75rem;
    height: 0.75rem;
    fill: currentColor;
    transition: transform 0.2s ease;
  }

  .toc-card__chevron--expanded {
    transform: rotate(180deg);
  }

  .toc-card__details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .toc-card__summary {
    margin: 0;
    color: var(--cds-text-secondary, #525252);
  }

  .toc-card__tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .toc-card__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .toc-card__controls :global(.combo-box) {
    width: min(16rem, 100%);
  }

  :global(.style-combobox .cds--list-box__menu) {
    max-height: 14rem;
  }

  .toc-card__version {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.85rem;
    color: var(--cds-text-helper, #6f6f6f);
  }

  .toc-card__version-label {
    font-weight: 600;
    color: var(--cds-text-primary, #161616);
  }

  .map-overlays {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: var(--page-gap);
  }

  .map-overlays__bottom {
    display: flex;
    justify-content: center;
  }

  .map-overlays__panel {
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.5rem 0.75rem 0.75rem;
    border-radius: 0.25rem;
    box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(6px);
  }

  .map-overlays__panel :global(.combo-box) {
    width: min(18rem, 60vw);
  }

  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .timeline-list__item {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    text-align: left;
    padding: 0.75rem;
    border: 1px solid var(--cds-border-subtle, #e0e0e0);
    border-radius: 0.25rem;
    background: var(--cds-layer, #ffffff);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
  }

  .timeline-list__item:hover,
  .timeline-list__item:focus-visible {
    border-color: var(--cds-interactive, #0f62fe);
    box-shadow: 0 0 0 2px rgba(15, 98, 254, 0.15);
    outline: none;
  }

  .timeline-list__item--active {
    border-color: var(--cds-support-success, #24a148);
    box-shadow: 0 0 0 2px rgba(36, 161, 72, 0.2);
  }

  .timeline-list__item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .timeline-list__item-header h3 {
    margin: 0;
    font-size: 1rem;
  }

  .timeline-list__range,
  .timeline-list__summary {
    margin: 0;
    color: var(--cds-text-secondary, #525252);
    font-size: 0.9rem;
  }

  .timeline-list__changes {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--cds-text-secondary, #525252);
    font-size: 0.85rem;
  }

  @media (max-width: 768px) {
    .map-overlays {
      padding: clamp(0.75rem, 4vw, 1rem);
    }

    .map-overlays__panel :global(.combo-box) {
      width: min(16rem, 70vw);
    }

  }

  @media (max-width: 480px) {
    .map-overlays__panel :global(.combo-box) {
      width: min(14rem, 80vw);
    }
  }
</style>
