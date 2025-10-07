import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { scheduleStyleReady } from '../styleReadyScheduler';

type Handler = (event?: unknown) => void;

describe('scheduleStyleReady', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  test('invokes the callback immediately when the style is already loaded', () => {
    const callback = vi.fn();
    const map = {
      isStyleLoaded: () => true,
      on: vi.fn(),
      off: vi.fn()
    };

    scheduleStyleReady(map as any, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(map.on).not.toHaveBeenCalled();
  });

  test('subscribes to style events and resolves once the map reports readiness', () => {
    const callback = vi.fn();
    let loaded = false;
    const handlers = new Map<string, Set<Handler>>();

    const map = {
      isStyleLoaded: () => loaded,
      on: vi.fn((event: string, handler: Handler) => {
        const set = handlers.get(event) ?? new Set<Handler>();
        set.add(handler);
        handlers.set(event, set);
      }),
      off: vi.fn((event: string, handler: Handler) => {
        handlers.get(event)?.delete(handler);
      })
    };

    const emit = (event: string) => {
      handlers.get(event)?.forEach((handler) => handler());
    };

    scheduleStyleReady(map as any, callback);

    expect(map.on).toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();

    emit('style.load');
    expect(callback).not.toHaveBeenCalled();

    loaded = true;
    emit('idle');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(map.off).toHaveBeenCalledTimes(3);
    expect(Array.from(handlers.values()).every((set) => set.size === 0)).toBe(true);
  });

  test('falls back to polling when events do not resolve the style immediately', () => {
    const callback = vi.fn();
    let loaded = false;
    const map = {
      isStyleLoaded: () => loaded,
      on: vi.fn(),
      off: vi.fn()
    };

    scheduleStyleReady(map as any, callback);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();

    loaded = true;
    vi.advanceTimersByTime(50);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(map.off).toHaveBeenCalledTimes(3);
  });

  test('supports maps that only expose once handlers', () => {
    const callback = vi.fn();
    let loaded = false;
    const handlers = new Map<string, Handler>();

    const map = {
      isStyleLoaded: () => loaded,
      once: vi.fn((event: string, handler: Handler) => {
        handlers.set(event, handler);
      })
    };

    scheduleStyleReady(map as any, callback);

    expect(map.once).toHaveBeenCalledTimes(3);
    expect(callback).not.toHaveBeenCalled();

    handlers.get('styledata')?.();
    expect(callback).not.toHaveBeenCalled();

    loaded = true;
    handlers.get('idle')?.();

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
