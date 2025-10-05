import type { LayerType, PMTilesLayerConfig } from './pmtiles';

export type DatasetGeometryType =
  | 'Polygon'
  | 'Line'
  | 'Point'
  | 'Raster'
  | 'Mixed';

export interface DatasetStyleDefinition {
  id: string;
  label: string;
  description: string;
  layerTypeOverride?: LayerType;
  paint?: PMTilesLayerConfig['paint'];
  layout?: PMTilesLayerConfig['layout'];
}

export interface DatasetVersion {
  id: string;
  label: string;
  url: string;
  effectiveFrom: string;
  effectiveTo?: string;
  summary: string;
  changes?: string[];
}

export interface DatasetMetadata {
  id: string;
  title: string;
  summary: string;
  description: string;
  theme: string;
  provider: string;
  geometryType: DatasetGeometryType;
  keywords: string[];
  defaultStyleId: string;
  defaultVersionId: string;
  mapConfig: {
    layerType: LayerType;
    sourceType?: PMTilesLayerConfig['sourceType'];
    sourceLayer?: string;
    minzoom?: number;
    maxzoom?: number;
  };
  styles: DatasetStyleDefinition[];
  versions: DatasetVersion[];
}

export interface DatasetSearchResult {
  dataset: DatasetMetadata;
  score: number;
  matches: string[];
}

export interface SelectedDatasetState {
  instanceId: string;
  dataset: DatasetMetadata;
  activeVersionId: string;
  activeStyleId: string;
}
