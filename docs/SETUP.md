# Setup

## Prerequisites

- Node.js 20.19 or newer
- npm 10 or newer
- Expo Go compatible with SDK 54 on Android or iOS
- Docker Desktop and Supabase CLI only when using the persistent backend
- A laptop and phone on the same trusted Wi-Fi network

## Install and configure

```bash
git clone https://github.com/markchweya/Reise.git
cd Reise
git switch ChweyasBranch
npm install
```

Copy `.env.example` to `.env`. Do not commit `.env`.

## Credential-free LAN mode

1. On Windows, run `ipconfig`; on macOS/Linux, run `ifconfig` or `ip addr`.
2. Find the laptop's private IPv4 address, for example `192.168.1.24`.
3. Set `EXPO_PUBLIC_DRIVER_BASE_URL=http://192.168.1.24:3000` in `.env`.
4. Permit Node.js on the private network if the operating system firewall asks.
5. Start the dashboard with `npm run dev:driver`.
6. In another terminal, start Expo with `npm run dev:mobile`.
7. Scan the QR code in Expo Go.

The phone requests `/api/live` every five seconds. This endpoint is for the controlled demo network; it intentionally stores only the latest position and disruption in the laptop process.

## Supabase mode

```bash
supabase start
supabase db reset
```

Copy the local API URL and anonymous key into both the Expo and Next public variables in `.env`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. The migration enables Realtime for `vehicle_positions` and `disruptions` and applies RLS.

## Physical-phone connection problems

- Confirm both devices are on the same Wi-Fi and neither uses a VPN or guest network isolation.
- Open `http://YOUR_LAPTOP_IP:3000/api/live` in the phone browser. If it fails, fix the firewall or address first.
- Start Expo with `npx expo start --lan`. Use `npx expo start --tunnel` only for the Expo bundle; the Reise driver feed still needs a reachable base URL.
- Clear Expo Go's cache and restart with `npx expo start --clear` if the bundle is stale.
- `expo-router` is also listed as root development tooling so the Expo Babel preset can resolve Router correctly from this npm workspace.
- Android emulators use `10.0.2.2` for the host, but a physical phone must use the laptop's LAN address.

## Browser GPS

Browser GPS requires user permission and may be inaccurate or unavailable on a laptop. The route simulator is the recommended test source. Production use requires HTTPS, operator-approved hardware and an authenticated write path.
