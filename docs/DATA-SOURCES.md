# Data sources

## Reise Test Network

The credential-free fixture includes B60, B47 and B57 in both useful and opposite directions; Fleet 6007 and 6012; Redingstrasse, Basel SBB, St. Jakob and Stallenstrasse; direct and transfer trips; delay, roadworks, event and closure scenarios; and prototype fares.

All test information is labelled `Reise Test Network — simulated transport data`. Coordinates and stop relationships are demonstration assumptions and are not an official timetable.

## Official Swiss data adapters

The official provider boundary is designed for:

- Swiss GTFS Static for stops, routes, calendars, trips and stop times.
- Open Journey Planner for official journey alternatives.
- GTFS-Realtime trip updates for predictions, delays and cancellations.
- GTFS-Realtime service alerts and SIRI where available for disruptions.
- Authorised official vehicle positions when licensing and access permit.

Authoritative entry points are `opentransportdata.swiss`, `data.opentransportdata.swiss` and `api-manager.opentransportdata.swiss`. Reise does not scrape SBB sites or applications.

Set `OFFICIAL_TRANSPORT_API_KEY` and `EXPO_PUBLIC_DATA_MODE=official` only after choosing the specific endpoint and reviewing its licence, rate limit and attribution requirements. With no key, the adapter returns documented fixtures and the UI must not imply official-current data.

Every journey time carries one of `scheduled`, `official_prediction` or `reise_live_estimate`. Every position carries one of the defined location sources. UI code must preserve these labels end to end.
