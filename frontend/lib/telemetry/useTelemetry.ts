'use client';
import { useSyncExternalStore } from 'react';
import { getTelemetryStore } from './store';
import type { TelemetryState } from './types';

/** Hook único de acceso a la telemetría. Los componentes no conocen el backend. */
export function useTelemetry(): TelemetryState & {
  refresh: () => void;
  setDemoOverride: (on: boolean) => void;
} {
  const store = getTelemetryStore();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return {
    ...state,
    refresh: () => store.refresh(),
    setDemoOverride: (on: boolean) => store.setDemoOverride(on),
  };
}
