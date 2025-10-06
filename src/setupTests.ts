import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  (window as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
}

vi.mock('maplibre-gl', () => {
  class MockMap {
    static instances: MockMap[] = [];

    private handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    private sources = new Map<string, unknown>();
    private layers = new Map<string, { id: string }>();

    addSource = vi.fn((id: string, source: unknown) => {
      this.sources.set(id, source);
    });

    removeSource = vi.fn((id: string) => {
      this.sources.delete(id);
    });

    getSource = vi.fn((id: string) => this.sources.get(id));

    addLayer = vi.fn((layer: { id: string }) => {
      this.layers.set(layer.id, layer);
    });

    removeLayer = vi.fn((id: string) => {
      this.layers.delete(id);
    });

    getLayer = vi.fn((id: string) => this.layers.get(id));

    setPaintProperty = vi.fn();
    setLayoutProperty = vi.fn();

    remove = vi.fn();

    setStyle = vi.fn((_style: unknown) => {
      this.sources.clear();
      this.layers.clear();
      this.emit('load');
    });

    isStyleLoaded = vi.fn(() => true);

    constructor(_options: unknown) {
      MockMap.instances.push(this);
      setTimeout(() => this.emit('load'), 0);
    }

    private emit(event: string, ...args: unknown[]) {
      this.handlers[event]?.forEach((handler) => handler(...args));
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      this.handlers[event] = this.handlers[event] ?? [];
      this.handlers[event].push(handler);
      if (event === 'load') {
        handler();
      }
      return this;
    }

    once(event: string, handler: (...args: unknown[]) => void) {
      handler();
      return this;
    }
  }

  const addProtocol = vi.fn();
  const removeProtocol = vi.fn();

  class AttributionControl {
    constructor(_options?: unknown) {}
  }

  const maplibre = {
    Map: MockMap,
    AttributionControl,
    addProtocol,
    removeProtocol
  };

  return {
    __esModule: true,
    default: maplibre,
    Map: MockMap,
    AttributionControl,
    addProtocol,
    removeProtocol
  };
});

vi.mock('pmtiles', () => {
  class Protocol {
    tile = vi.fn();
  }

  return {
    __esModule: true,
    Protocol
  };
});
