import { describe, expect, it } from 'vitest';
import type { PMTilesLayerConfig } from '$lib/types/pmtiles';

const sampleLayer: PMTilesLayerConfig = {
  id: 'demo-layer',
  url: 'https://example.com/data.pmtiles',
  layerType: 'fill',
  sourceType: 'vector',
  sourceLayer: 'demo',
  paint: {
    'fill-color': '#ff7f0e',
    'fill-opacity': 0.6
  }
};

describe('PMTiles layer config typings', () => {
  it('allows configuring paint properties', () => {
    expect(sampleLayer.paint?.['fill-color']).toBe('#ff7f0e');
    expect(sampleLayer.sourceLayer).toBe('demo');
  });

  it('requires an identifier and URL', () => {
    expect(sampleLayer.id).toBe('demo-layer');
    expect(sampleLayer.url.endsWith('.pmtiles')).toBe(true);
  });
});
