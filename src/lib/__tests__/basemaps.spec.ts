import { describe, expect, it } from 'vitest';
import { basemapConfigs } from '$lib/basemaps';
import type { BasemapConfig } from '$lib/basemaps';
import type { StyleSpecification } from 'maplibre-gl';

const getInlineStyle = (config: BasemapConfig): StyleSpecification => {
  if (typeof config.style === 'string') {
    throw new Error('Expected an inline style specification but received a URL.');
  }

  return config.style;
};

describe('basemap configurations', () => {
  it('includes OpenStreetMap raster tiles', () => {
    const osm = basemapConfigs.osm;
    const style = getInlineStyle(osm);
    expect(style.sources.osm.type).toBe('raster');
    if ('tiles' in style.sources.osm && Array.isArray(style.sources.osm.tiles)) {
      expect(style.sources.osm.tiles[0]).toContain('tile.openstreetmap.org');
    } else {
      throw new Error('OSM style missing tile URL');
    }
  });

  it('includes an empty white basemap', () => {
    const empty = basemapConfigs.empty;
    const style = getInlineStyle(empty);
    expect(style.layers[0].type).toBe('background');
    const paint = style.layers[0].paint;
    if (paint && 'background-color' in paint) {
      expect(paint['background-color']).toBe('#ffffff');
    } else {
      throw new Error('Empty style missing background color.');
    }
  });

  it('includes the Hintergrundkarte schwarz/weiss WMS layer', () => {
    const hintergrundkarte = basemapConfigs.hintergrundkarte;
    const style = getInlineStyle(hintergrundkarte);
    const source = style.sources.hintergrundkarte;
    if ('tiles' in source && Array.isArray(source.tiles)) {
      expect(source.tiles[0]).toContain('/api/wms?');
      expect(source.tiles[0]).toContain('LAYERS=ch.so.agi.hintergrundkarte_sw');
    } else {
      throw new Error('Hintergrundkarte style missing tile URL');
    }
    expect(style.layers[0].type).toBe('raster');
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
