export type LayerType =
  | 'background'
  | 'fill'
  | 'line'
  | 'symbol'
  | 'circle'
  | 'heatmap'
  | 'fill-extrusion'
  | 'raster'
  | 'hillshade';

export type PMTilesLayerConfig = {
  id: string;
  url: string;
  layerType: LayerType;
  sourceType?: 'vector' | 'raster';
  sourceLayer?: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  minzoom?: number;
  maxzoom?: number;
};
