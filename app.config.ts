import type { ExpoConfig } from 'expo/config';
import base from './app.json';

/**
 * Forwards .env into expo-constants at bundle time.
 *
 * DEV ONLY for SOMA_DEV_API_KEY: whatever lands in `extra` is readable by
 * anyone who has the JS bundle. Fine on your own phone over Expo Go; never
 * for a build you hand to anyone else. Ship with SOMA_PROVIDER=proxy so the
 * key stays in server/.
 */
export default (): ExpoConfig => ({
  ...(base.expo as ExpoConfig),
  extra: {
    SOMA_PROVIDER: process.env.SOMA_PROVIDER ?? 'proxy',
    SOMA_PROXY_URL: process.env.SOMA_PROXY_URL ?? 'http://localhost:8787',
    SOMA_DEV_API_KEY: process.env.SOMA_DEV_API_KEY ?? '',
    SOMA_DEV_BASE_URL: process.env.SOMA_DEV_BASE_URL ?? 'https://api.anthropic.com',
  },
});
