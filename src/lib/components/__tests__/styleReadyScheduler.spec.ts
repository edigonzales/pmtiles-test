import { describe, expect, test, vi } from 'vitest';
import { scheduleStyleReady } from '../styleReadyScheduler';

type OnceHandler = (event?: unknown) => void;

const createEventMap = () => {
  const handlers = new Map<string, OnceHandler>();
  const once = vi.fn((event: string, handler: OnceHandler) => {
    handlers.set(event, handler);
  });
  return {
    handlers,
    once
  };
};

describe('scheduleStyleReady', () => {
  test('invokes the callback immediately when the style is already loaded', () => {
    const callback = vi.fn();
    const { once } = createEventMap();

    scheduleStyleReady(
      {
        isStyleLoaded: () => true,
        once
      },
      callback
    );

    expect(callback).toHaveBeenCalledTimes(1);
    expect(once).not.toHaveBeenCalled();
  });

  test('waits for the next style.load event before invoking the callback', () => {
    const callback = vi.fn();
    const { once, handlers } = createEventMap();

    scheduleStyleReady(
      {
        isStyleLoaded: () => false,
        once
      },
      callback
    );

    expect(callback).not.toHaveBeenCalled();
    expect(once).toHaveBeenCalledWith('style.load', expect.any(Function));

    handlers.get('style.load')?.();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('falls back to idle events when style.load is not emitted', () => {
    const callback = vi.fn();
    const { once, handlers } = createEventMap();

    scheduleStyleReady(
      {
        isStyleLoaded: () => false,
        once
      },
      callback
    );

    expect(callback).not.toHaveBeenCalled();

    handlers.get('idle')?.();

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
