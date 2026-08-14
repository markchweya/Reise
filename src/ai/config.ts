import Constants from 'expo-constants';

export type ProviderKind = 'proxy' | 'direct' | 'ondevice';

interface SomaExtra {
  SOMA_PROVIDER?: string;
  SOMA_PROXY_URL?: string;
  SOMA_DEV_API_KEY?: string;
  SOMA_DEV_BASE_URL?: string;
}

/** app.config.ts forwards .env into expo-constants at bundle time. */
function extra(): SomaExtra {
  return (Constants.expoConfig?.extra ?? {}) as SomaExtra;
}

export function providerKind(): ProviderKind {
  const raw = extra().SOMA_PROVIDER;
  return raw === 'direct' || raw === 'ondevice' ? raw : 'proxy';
}

export function proxyUrl(): string {
  return (extra().SOMA_PROXY_URL ?? 'http://localhost:8787').replace(/\/$/, '');
}

/** DEV ONLY. Anything returned here is readable by anyone holding the bundle. */
export function devApiKey(): string {
  return extra().SOMA_DEV_API_KEY ?? '';
}

export function devBaseUrl(): string {
  return (extra().SOMA_DEV_BASE_URL ?? 'https://api.anthropic.com').replace(/\/$/, '');
}

export const CHAT_MODEL = 'claude-sonnet-5';
export const EMBED_DIM = 256;
