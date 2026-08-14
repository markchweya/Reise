import type { AIProvider } from './types';
import { providerKind } from './config';
import { RemoteProvider } from './remote';
import { OnDeviceProvider } from './ondevice';

let cached: AIProvider | null = null;

/** The only way to reach a model. UI code calls this; it never imports a
 *  provider or an SDK directly. */
export function ai(): AIProvider {
  if (cached) return cached;
  cached = providerKind() === 'ondevice' ? new OnDeviceProvider() : new RemoteProvider();
  return cached;
}

export function resetProvider(): void {
  cached = null;
}

export type { AIProvider, ChatMessage, ChatOpts, StreamChunk } from './types';
