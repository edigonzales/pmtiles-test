import type { Map as MaplibreMap } from 'maplibre-gl';

type MapWithEvents = Pick<MaplibreMap, 'isStyleLoaded'> & {
  once?: (event: string, handler: (event?: unknown) => void) => void;
};

export type StyleReadyCallback = () => void;

export const scheduleStyleReady = (map: MapWithEvents, callback: StyleReadyCallback) => {
  if (map.isStyleLoaded?.()) {
    callback();
    return;
  }

  if (typeof map.once !== 'function') {
    callback();
    return;
  }

  let triggered = false;
  const handleReady = () => {
    if (triggered) return;
    triggered = true;
    callback();
  };

  map.once('style.load', handleReady);
  map.once('load', handleReady);
  map.once('idle', handleReady);
};
