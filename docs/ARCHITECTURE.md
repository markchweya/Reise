# Architecture

## Boundaries

```text
Passenger Expo app ─┐
                    ├─ shared schemas ─ routing engine ─ provider interfaces
Driver Next app ────┘          │                 │
        │                       │                 ├─ Reise Test Network
        └─ LAN API / Supabase Realtime           └─ Official Swiss adapters
```

The UI never calculates routes. `@reise/routing` owns timetable traversal, ranking and fares. `@reise/ai` converts supported language into structured preferences and explains journeys returned by the router. `@reise/transit-providers` retains data provenance.

## Real-time pipeline

The credential-free demo posts a validated `VehiclePosition` from the dashboard to `/api/live`. The latest payload is held in the Next process and polled by the phone every five seconds. It is suitable for one controlled laptop/phone demonstration, not production.

The persistent path writes the same schema to Supabase. RLS permits a driver to insert positions only for their own active shift and assigned physical vehicle. Supabase Realtime publishes positions and disruptions; service-role credentials never enter either client.

## Position truth

- Scheduled position: derived from a timetable and never labelled current.
- Official prediction: supplied by an authorised external provider.
- Reise estimate: calculated from a fresh checked-in vehicle position.
- Current vehicle position: shown only when the timestamp passes the freshness threshold.

Out-of-order timestamps, duplicate shift/timestamp pairs, impossible jumps and post-checkout updates are rejected or downgraded.

## Routing

The router expands scheduled trips over ordered stops, applies delay to time-dependent legs, rejects cancellations and closed endpoints, and enumerates direct and one-transfer paths. It enforces minimum transfer time and ranks by fastest, fewest transfers, walking, price or accessibility. The algorithm is isolated and testable; a larger network can replace enumeration with RAPTOR or full time-dependent Dijkstra behind the same interface.

## Phone-memory AI

`LocalMemoryAssistant` is the default. It runs entirely in the Expo JavaScript runtime and uses a bounded intent/place parser. Context contains origin, destination, priority, travelcard and departure time. The optional OpenAI-compatible provider is an explanation layer only and must validate its structured output before display.

## Shift lifecycle and security

The lifecycle is `signed out → check-in → active/paused → handed over/completed`. Partial assignments cannot transmit. Unique partial indexes prevent an active driver or physical vehicle from appearing in two assignments. Handover tokens are hashed, single-use and time-limited. The database trigger rejects inactive-shift or mismatched-vehicle positions.

Production still requires operator approval, employee policy, authenticated devices, HTTPS, rate limiting, audit logs, key rotation, a retention review and a Swiss data-protection impact assessment.

## Future integration

The provider boundaries allow an approved operator or future SBB integration to supply timetables, predictions, disruptions, fares and onboard GPS without coupling those systems to the passenger UI.
