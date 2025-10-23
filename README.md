# todo
- featureinfo
- featureinfo über Tile-Grenze
- Styling
- Styling über Tile-Grenze
- geokatalog (tree)


# PMTiles MapLibre starter

A SvelteKit + Carbon Design System starter for exploring [PMTiles](https://github.com/protomaps/PMTiles) data in a [MapLibre GL JS](https://maplibre.org/) map. The project wires up a basemap selector (OpenStreetMap and a demo WMS layer) and leaves a placeholder for registering your own PMTiles sources and layers.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Run the development server

```bash
npm run dev -- --open
```

### 3. Execute quality checks

```bash
# Type-check the project
npm run check

# Run the Vitest suite
npm run test
```

## Project structure

- `src/lib/basemaps.ts` defines the available basemaps and their MapLibre style specifications.
- `src/lib/components/MapView.svelte` initialises MapLibre, registers the PMTiles protocol, and keeps any configured PMTiles layers in sync with the map style.
- `src/routes/+page.svelte` renders the Carbon-powered UI controls and passes the selected basemap and PMTiles configuration to the `MapView` component.
- `src/lib/__tests__/basemaps.spec.ts` and `src/lib/__tests__/pmtiles-types.spec.ts` provide starter Vitest suites that validate the basemap styles and PMTiles layer typings.

To display your PMTiles data, update the `pmtilesLayers` array in `src/routes/+page.svelte` with the sources and layers you want to show. Each entry supports vector or raster sources and can be styled with MapLibre paint and layout properties.

## WMS proxy cache

Requests to the "Hintergrundkarte schwarz/weiss" layer are routed through `/api/wms`, which caches PNG responses on disk to reduce load on the upstream service. You can control the cache with the following environment variables:

- `WMS_CACHE_DIR` – directory used to store cached tiles (defaults to `.wms-cache` in the project root).
- `WMS_CACHE_MAX_BYTES` – maximum cache size in bytes before the oldest entries are pruned (defaults to 10 GB).
- `WMS_CACHE_MAX_AGE_MS` – time-to-live for cached PNGs in milliseconds (defaults to one day).
- `WMS_PROXY_BASE_URL` – upstream WMS base URL (defaults to `https://geo.so.ch/api/wms`).

## Production build

Create a production build with:

```bash
npm run build
```

Preview the build locally with:

```bash
npm run preview
```

## Develop

```
conda create -n gdal
```

```
conda activate gdal
```

```
conda install conda-forge::gdal
```

```
conda install conda-forge::tippecanoe
```


```
conda deactivate
```


```
ogr2ogr -f GPKG grundnutzung_3857.gpkg npl_nutzungsplanung_v1_2_2056.gpkg \
  -nln grundnutzung \
  -t_srs EPSG:3857 \
  -nlt PROMOTE_TO_MULTI \
  -lco SPATIAL_INDEX=YES \
  grundnutzung
```

```
ogr2ogr -t_srs EPSG:4326 cb_2018_us_zcta510_500k.json cb_2018_us_zcta510_500k.shp
# Creates a layer in the vector tiles named "zcta"
tippecanoe -zg --projection=EPSG:4326 -o cb_2018_us_zcta510_500k_nolimit.pmtiles -l zcta cb_2018_us_zcta510_500k.json


ogr2ogr -f GeoJSONSeq /vsistdout/ npl_nutzungsplanung_v1_2_2056.gpkg grundnutzung -lco RS=YES -t_srs EPSG:4326 \
| tippecanoe -o grundnutzung.pmtiles -zg --drop-densest-as-needed -r1 -pk -pf --layer=grundnutzung
```


```
ogr2ogr -f GeoJSONSeq /vsistdout/ npl_nutzungsplanung_v1_2_2056.gpkg grundnutzung -lco RS=YES -t_srs EPSG:4326 \
| tippecanoe -o grundnutzung.pmtiles --minimum-zoom=10 --maximum-zoom=20 --drop-densest-as-needed -r1 -pk -pf --layer=grundnutzung --use-attribute-for-id=t_id --no-clipping
```

```
ogr2ogr -f GeoJSONSeq /vsistdout/ npl_nutzungsplanung_v1_2_2056.gpkg grundnutzung -lco RS=YES -t_srs EPSG:4326 \
| tippecanoe -o grundnutzung_v2.pmtiles --minimum-zoom=1 --maximum-zoom=19 --no-clipping --no-line-simplification -r1 -pk -pf --layer=grundnutzung --use-attribute-for-id=t_id --no-clipping
```

```
ogr2ogr -f GeoJSONSeq /vsistdout/ 2601.ch.so.agi.av.mopublic.gpkg bodenbedeckung -lco RS=YES -t_srs EPSG:4326 \
| tippecanoe \
  -o bodenbedeckung.pmtiles \
  --layer=bodenbedeckung \
  --use-attribute-for-id=t_id \
  --minimum-zoom=1 --maximum-zoom=19 \
  -pS \
  --no-tiny-polygon-reduction \
  --detect-shared-borders \
  --no-feature-limit --no-tile-size-limit \
  --extra-detail=13
``` 



```
git fetch origin pull/9/head:codex/update-interlistextdocumentservice-to-bypass-cache
```
 
```
git checkout codex/update-interlistextdocumentservice-to-bypass-cache
```
 
```
git checkout main
```