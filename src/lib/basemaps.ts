import type { StyleSpecification } from 'maplibre-gl';

export type BasemapId = 'empty' | 'osm' | 'hintergrundkarte' | 'swisstopo';

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

const emptyStyle: StyleSpecification = {
  version: 8,
  name: 'No background',
  sources: {},
  layers: [
    {
      id: 'empty-background',
      type: 'background',
      paint: {
        'background-color': '#ffffff'
      }
    }
  ]
};

const hintergrundkarteStyle: StyleSpecification = {
  version: 8,
  name: 'Hintergrundkarte schwarz/weiss',
  sources: {
    hintergrundkarte: {
      type: 'raster',
      tiles: [
        '/api/wms?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&FORMAT=image/png&TRANSPARENT=true&LAYERS=ch.so.agi.hintergrundkarte_sw&STYLES=&CRS=EPSG:3857&WIDTH=256&HEIGHT=256&DPI=96&OPACITIES=255&BBOX={bbox-epsg-3857}'
      ],
      tileSize: 256,
      attribution: '© Amt für Geoinformation Kanton Solothurn'
    }
  },
  layers: [
    {
      id: 'hintergrundkarte-basemap',
      type: 'raster',
      source: 'hintergrundkarte',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

const swisstopoStyle =
  'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.basemap.vt/style.json?key=xmETqTBaiAH9bbZXXiFm';

export const basemapConfigs: Record<BasemapId, BasemapConfig> = {
  swisstopo: {
    id: 'swisstopo',
    label: 'swisstopo Vector Basemap',
    description: 'Official Swiss vector basemap provided by swisstopo.',
    style: swisstopoStyle
  },
  hintergrundkarte: {
    id: 'hintergrundkarte',
    label: 'Hintergrundkarte schwarz/weiss',
    description: 'Black and white background map provided by geo.so.ch.',
    style: hintergrundkarteStyle
  },
  osm: {
    id: 'osm',
    label: 'OpenStreetMap',
    description: 'Community driven basemap sourced from openstreetmap.org tiles.',
    style: osmStyle
  },
  empty: {
    id: 'empty',
    label: 'No background',
    description: 'A blank white background suitable for focusing on overlay data.',
    style: emptyStyle
  }
};

export const basemapOptions: BasemapConfig[] = [
  basemapConfigs.swisstopo,
  basemapConfigs.hintergrundkarte,
  basemapConfigs.osm,
  basemapConfigs.empty
];
