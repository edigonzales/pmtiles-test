import { getDefaultVectorLayer } from '../pmtilesMetadata';

describe('getDefaultVectorLayer', () => {
  it('returns the first vector layer id when present', () => {
    expect(
      getDefaultVectorLayer({
        vector_layers: [
          { id: 'buildings' },
          { id: 'roads' }
        ]
      })
    ).toBe('buildings');
  });

  it('ignores blank ids and falls back to subsequent entries', () => {
    expect(
      getDefaultVectorLayer({
        vector_layers: [
          { id: ' ' },
          { id: 'roads' }
        ]
      })
    ).toBe('roads');
  });

  it('falls back to layer names when ids are missing', () => {
    expect(
      getDefaultVectorLayer({
        vector_layers: [
          { name: 'water' }
        ]
      })
    ).toBe('water');
  });

  it('returns null when no usable metadata exists', () => {
    expect(getDefaultVectorLayer({ vector_layers: [] })).toBeNull();
    expect(getDefaultVectorLayer(undefined)).toBeNull();
    expect(
      getDefaultVectorLayer({
        vector_layers: [
          { id: '' },
          { name: ' ' }
        ]
      })
    ).toBeNull();
  });
});
