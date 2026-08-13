# Five-minute demo

## Before the demo

Run `npm run dev:driver` and `npm run dev:mobile`. Open the dashboard on the laptop and Reise in Expo Go on the phone. Use test driver `driver01@reise.test` with PIN `2460`.

## Script

1. Sign in on the laptop. Explain that the PIN is SHA-256 compared in memory and never stored as plain text.
2. Select Fleet 6007, line B60, direction Muttenz Industriepark, the 08:02 trip and Route simulator.
3. Review the first/final stops, then press **Start shift and begin tracking**.
4. On the phone, open Reise AI and ask: “How do I get from Redingstrasse to Stallenstrasse?” Show that the answer is marked **On-device memory**.
5. Select the journey. Show the vehicle position and the separate Scheduled, Official prediction and Reise estimate times.
6. On the laptop, select **St. Jakob football event**. Within five seconds, show the service-change message on the phone.
7. Use the phone's boarding check. To demonstrate a wrong direction, select the B60 west direction during a new test shift.
8. Change the delay to +8 minutes and show the next phone refresh.
9. Create a handover code and explain that production stores only its hash and permits one use before expiry.
10. End the shift. The API changes to `offline`; the phone may retain the last known position but must not call it current.

## Expected proof points

- Fleet 6007 and 6012 remain separate even though both can operate B60.
- The driver must confirm vehicle, route, direction and trip before transmitting.
- The local assistant explains routing-engine output; it does not invent a route.
- A disruption reaches the phone from the laptop over the local network.
- Checkout rejects subsequent shift updates and removes current-position semantics.
