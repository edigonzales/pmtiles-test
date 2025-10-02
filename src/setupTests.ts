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
    private handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

    constructor(_options: unknown) {
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

    remove() {}
    setStyle(_style: unknown) {
      this.emit('load');
    }
    isStyleLoaded() {
      return true;
    }
    getLayer(_id: string) {
      return undefined;
    }
    addLayer(_layer: unknown) {}
    removeLayer(_id: string) {}
    getSource(_id: string) {
      return undefined;
    }
    addSource(_id: string, _source: unknown) {}
    removeSource(_id: string) {}
    setPaintProperty(_id: string, _name: string, _value: unknown) {}
    setLayoutProperty(_id: string, _name: string, _value: unknown) {}
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
