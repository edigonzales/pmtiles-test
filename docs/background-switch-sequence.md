# Dataset lifecycle when switching basemap styles

The following sequence diagram illustrates how PMTiles foreground datasets are handled when the basemap (background layer) changes in `MapView`.

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Layer toggle UI
    participant MV as MapView.svelte
    participant M as MapLibre Map
    participant S as styleReadyScheduler
    participant P as pmtilesSynchroniser

    U->>UI: Select new background layer
    UI->>MV: Update `basemap` prop
    MV->>MV: Reactive block detects basemap change
    MV->>MV: Clear `attachedLayerIds` & `layerStates`
    MV->>M: setStyle(new basemap style)
    Note over M: MapLibre unloads previous style<br/>and removes PMTiles layers
    MV->>S: scheduleStyleReady(map, callback)
    S-->>M: Subscribe to style.load/styledata/idle
    loop Until style ready
        M-->>S: Emit style events / report not ready
        S-->>S: Poll `isStyleLoaded()` (50ms interval)
    end
    S-->>MV: Invoke callback when style ready
    MV->>MV: scheduleSync()
    MV->>P: syncPmtilesLayers()
    P->>M: addSource(pmtiles://...)
    P->>M: addLayer(PMTiles layer)
    Note over M: Foreground dataset becomes visible again
```

The diagram is based on the logic in `MapView.svelte`, `styleReadyScheduler.ts`, and `pmtilesSynchroniser.ts`, which coordinate the basemap switch and foreground dataset re-attachment.
