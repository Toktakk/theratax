# TheraTax — Therapist User Flow

1. **Onboarding** (one-time) — choose business type, Flat Rate vs Actual Cost
2. **Swipe feed** (fast, frequent) — log income/expense in 30–60 seconds
3. **Attach receipt** (fast, frequent) — photo linked to a transaction
4. **Create invoice** (occasional) — client, service, amount → export PDF
5. **Tax summary** (occasional) — net profit, estimated tax owed

Optimization priority: steps 2–3 must be near-instant (used between every
client). Steps 4–5 can tolerate a short load — they happen once per
client or once a week, not every session.