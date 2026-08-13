# Reise

[![CI](https://github.com/markchweya/Reise/actions/workflows/ci.yml/badge.svg?branch=ChweyasBranch)](https://github.com/markchweya/Reise/actions/workflows/ci.yml)
[![Expo SDK 57](https://img.shields.io/badge/Expo-57-000000?logo=expo)](https://docs.expo.dev/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-171717?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-12%20passing-087A45)](./docs/TESTING.md)
[![License MIT](https://img.shields.io/badge/license-MIT-EB0000)](./LICENSE)

> Know where to go, what to take and when it will really arrive.

Reise is a multilingual, local-first public-transport assistant and driver-operations MVP for a simulated Basel-area network. A driver can check into a physical test vehicle on a laptop, transmit simulated GPS positions, report a disruption and hand over or close a shift. A passenger can plan and follow the journey on an Expo phone.

Reise is an independent prototype. It uses an SBB-inspired red palette at the product owner's request, but it does not use an SBB logo, trademark, application design, or proprietary asset.

## What works

- Expo passenger application with Home, Reise AI, Journey, Tickets and Profile tabs.
- Local phone-memory assistant that needs no API key and never calculates routes itself.
- Time-dependent routing across direct and transfer journeys with delay, cancellation and closed-stop handling.
- Driver login, explicit vehicle/line/direction/trip check-in and five-second route simulation.
- Laptop-to-phone LAN feed for GPS and disruption demonstration without external credentials.
- Scheduled, official-prediction and Reise-estimate provenance shown separately.
- Correct-vehicle and wrong-direction checks.
- Prototype regular, supersaver and travelcard-adjusted fares.
- Eight passenger achievements with locked and unlocked states.
- English, German, French and Italian translation dictionaries with completeness tests.
- Supabase schema, row-level security, Realtime publication and seeded Basel test data.
- Official Swiss data adapter boundary for GTFS Static, OJP, GTFS-Realtime and SIRI.

## Local-first AI

The default `LocalMemoryAssistant` runs in the phone application's JavaScript memory. It extracts supported intents and places, preserves structured context, calls the routing engine, then explains only the returned data. No prompt or passenger location is sent to a cloud model during the test.

An OpenAI-compatible provider interface is present for later grounded explanations. The route calculation remains outside the language model in every mode.

## Repository

```text
apps/mobile                  Expo 57 passenger app
apps/driver                  Next.js 16 driver dashboard + LAN API
packages/shared              Schemas, lifecycle rules, translations
packages/routing             Time-dependent routing and fares
packages/transit-providers   Test fixtures and official adapters
packages/ai                  Local and optional hosted AI providers
supabase                     Migration and seed data
docs                         Setup, demo, architecture and testing
```

## Quick start

Prerequisites: Node.js 20.9+, npm 10+, Expo Go on a phone, and both devices on the same network.

```bash
npm install
npm run dev:driver
```

Find the laptop's LAN address, copy `.env.example` to `.env`, and set:

```text
EXPO_PUBLIC_DRIVER_BASE_URL=http://YOUR_LAPTOP_IP:3000
```

Then start the phone app:

```bash
npm run dev:mobile
```

Scan the QR code with Expo Go. The driver test PIN is documented in [the five-minute demo](./docs/DEMO.md).

## Commands

| Command                | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm run dev:driver`   | Start the laptop dashboard and LAN feed       |
| `npm run dev:mobile`   | Start Expo for the phone                      |
| `npm test`             | Run routing, safety, AI and translation tests |
| `npm run typecheck`    | Type-check every workspace                    |
| `npm run lint`         | Run workspace linting                         |
| `npm run build`        | Create the driver production build            |
| `npm run format:check` | Verify formatting                             |

## Documentation

- [Setup and LAN troubleshooting](./docs/SETUP.md)
- [Five-minute demo](./docs/DEMO.md)
- [Architecture and security](./docs/ARCHITECTURE.md)
- [Transport data sources](./docs/DATA-SOURCES.md)
- [Tests and acceptance coverage](./docs/TESTING.md)

## Honest limitations

- Fares are labelled prototypes and cannot be purchased.
- The no-credential LAN feed is intentionally process-memory storage; restarting the driver server clears it.
- Supabase production authentication and operator onboarding require configured projects and policies.
- Official Swiss providers are adapter boundaries with fixture fallback until credentials and source-specific agreements are supplied.
- Expo push notifications are prepared conceptually but not registered in the credential-free MVP.
- Browser GPS depends on laptop permission and hardware; route simulation is the reliable demo source.

## License

MIT. See [LICENSE](./LICENSE).
