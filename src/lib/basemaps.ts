import type { StyleSpecification } from 'maplibre-gl';

export type BasemapId = 'osm' | 'wms' | 'swisstopo';

export interface BasemapConfig {
  id: BasemapId;
  label: string;
  description: string;
  style: StyleSpecification | string;
}

const osmStyle: StyleSpecification = {
  version: 8,
  name: 'OpenStreetMap',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm-basemap',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

const wmsStyle: StyleSpecification = {
  version: 8,
  name: 'US States WMS',
  sources: {
    states: {
      type: 'raster',
      tiles: [
        'https://ahocevar.com/geoserver/wms?service=WMS&request=GetMap&layers=topp:states&styles=&format=image/png&transparent=true&version=1.1.1&height=256&width=256&srs=EPSG:3857&bbox={bbox-epsg-3857}'
      ],
      tileSize: 256,
      attribution: '© Ahocevar.com demo WMS'
    }
  },
  layers: [
    {
      id: 'wms-basemap',
      type: 'raster',
      source: 'states',
      minzoom: 0,
      maxzoom: 12
    }
  ]
};

const swisstopoStyle =
  'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.basemap.vt/style.json?key=xmETqTBaiAH9bbZXXiFm';

export const basemapConfigs: Record<BasemapId, BasemapConfig> = {
  osm: {
    id: 'osm',
    label: 'OpenStreetMap',
    description: 'Community driven basemap sourced from openstreetmap.org tiles.',
    style: osmStyle
  },
  wms: {
    id: 'wms',
    label: 'Demo WMS (US States)',
    description: 'Example WMS service served as raster tiles from ahocevar.com.',
    style: wmsStyle
  },
  swisstopo: {
    id: 'swisstopo',
    label: 'swisstopo Vector Basemap',
    description: 'Official Swiss vector basemap provided by swisstopo.',
    style: swisstopoStyle
  }
};

export const basemapOptions = Object.values(basemapConfigs);
