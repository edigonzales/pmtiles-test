import type { Map as MaplibreMap } from 'maplibre-gl';

type StyleEventHandler = (event?: unknown) => void;

type MapWithEvents = Pick<MaplibreMap, 'isStyleLoaded'> & {
  once?: (event: string, handler: StyleEventHandler) => void;
  on?: (event: string, handler: StyleEventHandler) => void;
  off?: (event: string, handler: StyleEventHandler) => void;
};

export type StyleReadyCallback = () => void;

const EVENTS_TO_WATCH = ['style.load', 'styledata', 'idle'] as const;
const POLL_INTERVAL_MS = 50;
const MAX_POLLS = 120; // ~6 seconds of waiting as a safety net.

export const scheduleStyleReady = (map: MapWithEvents, callback: StyleReadyCallback) => {
  if (map.isStyleLoaded?.()) {
    callback();
    return;
  }

  const hasOnOff = typeof map.on === 'function' && typeof map.off === 'function';
  const hasOnce = typeof map.once === 'function';

  if (!hasOnOff && !hasOnce) {
    callback();
    return;
  }

  let completed = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleNextPoll = (attempt = 0) => {
    if (completed) return;

    if (map.isStyleLoaded?.()) {
      finish();
      return;
    }

    if (attempt >= MAX_POLLS) {
      finish();
      return;
    }

    pollTimer = setTimeout(() => {
      pollTimer = null;
      scheduleNextPoll(attempt + 1);
    }, POLL_INTERVAL_MS);
  };

  const finish = () => {
    if (completed) return;
    completed = true;

    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }

    if (hasOnOff && typeof map.off === 'function') {
      for (const event of EVENTS_TO_WATCH) {
        map.off(event, handleEvent);
      }
    }

    callback();
  };

  const handleEvent: StyleEventHandler = () => {
    if (completed) return;
    if (map.isStyleLoaded?.()) {
      finish();
      return;
    }

    if (!pollTimer) {
      scheduleNextPoll();
    }
  };

  if (hasOnOff && typeof map.on === 'function') {
    for (const event of EVENTS_TO_WATCH) {
      map.on(event, handleEvent);
    }
  } else if (hasOnce && typeof map.once === 'function') {
    for (const event of EVENTS_TO_WATCH) {
      map.once(event, handleEvent);
    }
  }

  scheduleNextPoll();
};
