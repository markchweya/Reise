import { testNetwork } from '@reise/transit-providers';
import type { Disruption, VehiclePosition } from '@reise/shared';

export type LiveState = {
  position: VehiclePosition;
  disruption?: Disruption;
  tracking: 'offline' | 'paused' | 'active';
  updatedAt: string;
};

declare global {
  var __reiseLiveState: LiveState | undefined;
}

export const getLiveState = (): LiveState => {
  globalThis.__reiseLiveState ??= {
    position: testNetwork.vehicles[0]!,
    tracking: 'offline',
    updatedAt: new Date().toISOString(),
  };
  return globalThis.__reiseLiveState;
};

export const setLiveState = (state: LiveState): LiveState => {
  globalThis.__reiseLiveState = state;
  return state;
};
