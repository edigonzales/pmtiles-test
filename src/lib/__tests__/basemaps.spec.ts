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

  it('includes an empty white basemap', () => {
    const empty = basemapConfigs.empty;
    expect(empty.style.layers[0].type).toBe('background');
    expect(empty.style.layers[0].paint?.['background-color']).toBe('#ffffff');
  });

  it('includes the Hintergrundkarte schwarz/weiss WMS layer', () => {
    const hintergrundkarte = basemapConfigs.hintergrundkarte;
    const source = hintergrundkarte.style.sources.hintergrundkarte;
    if ('tiles' in source && Array.isArray(source.tiles)) {
      expect(source.tiles[0]).toContain('geo.so.ch');
      expect(source.tiles[0]).toContain('LAYERS=ch.so.agi.hintergrundkarte_sw');
    } else {
      throw new Error('Hintergrundkarte style missing tile URL');
    }
    expect(hintergrundkarte.style.layers[0].type).toBe('raster');
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
