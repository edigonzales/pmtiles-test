export interface PMTilesVectorLayerMetadata {
  id?: string | null;
  name?: string | null;
}

export interface PMTilesMetadata {
  vector_layers?: PMTilesVectorLayerMetadata[] | null;
}

const normalise = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim() : '';

export const getDefaultVectorLayer = (metadata: PMTilesMetadata | null | undefined) => {
  if (!metadata?.vector_layers || !Array.isArray(metadata.vector_layers)) {
    return null;
  }

  for (const layer of metadata.vector_layers) {
    const id = normalise(layer?.id ?? undefined);
    if (id) {
      return id;
    }
  }

  for (const layer of metadata.vector_layers) {
    const name = normalise(layer?.name ?? undefined);
    if (name) {
      return name;
    }
  }

  return null;
};
