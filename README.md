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

## Production build

Create a production build with:

```bash
npm run build
```

Preview the build locally with:

```bash
npm run preview
```

To deploy, configure the appropriate [SvelteKit adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
