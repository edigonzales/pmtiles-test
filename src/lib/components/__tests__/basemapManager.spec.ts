import { describe, expect, test } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import {
  mergePreparedBasemapIntoStyle,
  normaliseStyleSpecification,
  prepareBasemapStyle
} from '../basemapManager';

describe('basemapManager', () => {
  test('normaliseStyleSpecification resolves relative URLs', () => {
    const style: StyleSpecification = {
      version: 8,
      name: 'Test style',
      sprite: './sprite',
      glyphs: '../glyphs/{fontstack}/{range}.pbf',
      sources: {
        demo: {
          type: 'vector',
          tiles: ['./tiles/{z}/{x}/{y}.pbf'],
          url: './sources/demo.json'
        } as any
      },
      layers: []
    };

    const baseUrl = 'https://example.com/styles/base/style.json';
    const normalised = normaliseStyleSpecification(style, baseUrl);

    expect(normalised.sprite).toBe('https://example.com/styles/base/sprite');
    expect(normalised.glyphs).toBe('https://example.com/styles/glyphs/{fontstack}/{range}.pbf');
    const normalisedSource = normalised.sources?.demo as any;
    expect(normalisedSource?.tiles).toEqual([
      'https://example.com/styles/base/tiles/{z}/{x}/{y}.pbf'
    ]);
    expect(normalisedSource?.url).toBe('https://example.com/styles/base/sources/demo.json');
    const originalSource = style.sources?.demo as any;
    expect(originalSource?.url).toBe('./sources/demo.json');
  });

  test('prepareBasemapStyle prefixes identifiers and tracks visibility', () => {
    const style: StyleSpecification = {
      version: 8,
      name: 'Example',
      sources: {
        base: {
          type: 'vector',
          url: 'https://example.com/data.json'
        } as any
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: { 'background-color': '#fff' }
        },
        {
          id: 'land',
          type: 'fill',
          source: 'base',
          'source-layer': 'land',
          layout: { visibility: 'visible' },
          paint: { 'fill-color': '#abcdef' }
        } as any,
        {
          id: 'land-outline',
          type: 'line',
          ref: 'land'
        } as any
      ]
    };

    const prepared = prepareBasemapStyle('osm', style, { visible: false });

    expect(Object.keys(prepared.sources)).toEqual(['osm::base']);
    expect(prepared.layerIds).toEqual([
      'osm::background',
      'osm::land',
      'osm::land-outline'
    ]);
    const fillLayer = prepared.layers[1] as any;
    const refLayer = prepared.layers[2] as any;
    expect(fillLayer.source).toBe('osm::base');
    expect(refLayer.ref).toBe('osm::land');
    expect(prepared.layers.every((layer) => layer.layout?.visibility === 'none')).toBe(true);
    expect(prepared.visibility['osm::background']).toBe('visible');
    expect(prepared.visibility['osm::land']).toBe('visible');
    expect(style.layers?.[1]?.layout?.visibility).toBe('visible');
  });

  test('mergePreparedBasemapIntoStyle appends sources and layers', () => {
    const baseStyle: StyleSpecification = {
      version: 8,
      name: 'Base',
      sources: {},
      layers: []
    };

    const prepared = prepareBasemapStyle('swisstopo', {
      version: 8,
      name: 'Demo',
      sources: {
        base: {
          type: 'raster',
          tiles: ['https://example.com/tiles/{z}/{x}/{y}.png']
        } as any
      },
      layers: [
        {
          id: 'raster-layer',
          type: 'raster',
          source: 'base'
        } as any
      ]
    }, { visible: true });

    mergePreparedBasemapIntoStyle(baseStyle, prepared);

    expect(Object.keys(baseStyle.sources ?? {})).toContain('swisstopo::base');
    expect(baseStyle.layers?.map((layer) => layer.id)).toContain('swisstopo::raster-layer');
  });
});
