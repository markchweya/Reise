# Testing

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The automated suite covers direct routing, transfer routing, fewest-transfer ranking, cancellation exclusion, closed-stop avoidance, missed-connection recalculation, travelcard fares, wrong-direction detection, impossible GPS jumps, duplicate vehicle assignment prevention, handover single-use, post-checkout GPS rejection, translation completeness, AI schema validation and no-key fallback.

The driver production build verifies the App Router dashboard and dynamic LAN API. Expo type-checking verifies all five screens and the native map integration. A physical-phone network check remains environment-dependent and is documented in `SETUP.md`.

Before a release, also test GPS permission denial, stale positions, browser closure, Supabase outage, official-provider rate limits, screen-reader labels, font scaling, colour contrast and a full handover between two authenticated driver accounts.
