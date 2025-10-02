import { describe, expect, it } from 'vitest';
import { basemapConfigs } from '$lib/basemaps';

describe('basemap configurations', () => {
  it('includes OpenStreetMap raster tiles', () => {
    const osm = basemapConfigs.osm;
    expect(osm.style.sources.osm.type).toBe('raster');
    if ('tiles' in osm.style.sources.osm && Array.isArray(osm.style.sources.osm.tiles)) {
      expect(osm.style.sources.osm.tiles[0]).toContain('tile.openstreetmap.org');
    } else {
      throw new Error('OSM style missing tile URL');
    }
  });

  it('includes a demo WMS layer', () => {
    const wms = basemapConfigs.wms;
    const source = wms.style.sources.states;
    if ('tiles' in source && Array.isArray(source.tiles)) {
      expect(source.tiles[0]).toContain('geoserver');
    } else {
      throw new Error('WMS style missing tile URL');
    }
    expect(wms.style.layers[0].type).toBe('raster');
  });

  it('includes the swisstopo vector basemap style URL', () => {
    const swisstopo = basemapConfigs.swisstopo;
    if (typeof swisstopo.style === 'string') {
      expect(swisstopo.style).toContain('vectortiles.geo.admin.ch/styles/ch.swisstopo.basemap');
      expect(swisstopo.style).toContain('style.json');
    } else {
      throw new Error('swisstopo style should be provided as a hosted style URL');
    }
  });
});
