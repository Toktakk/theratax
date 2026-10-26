# TheraTax — Therapist User Flow

1. **Onboarding** (one-time) — choose business type, Flat Rate vs Actual Cost
2. **Feed** (fast, frequent) — log income or an expense in one request. Massage income can name a saved spa or clinic, a massage type, a base amount, an additional fee, and a note. A photo is not required. The same feed lists income before expenses. A separate daily summary adds base, additional fees, and only the hours recorded as a bonus.
3. **Attach receipt** (optional) — a photo linked to a transaction, in a second request, when there is a photo. Expenses can still use it. Income can be saved with no image.
4. **Create invoice** (occasional) — choose a saved spa, clinic, or client, and a day or a month. The bill is built from the income and bonus rows for that recipient and period, then exported as a PDF. Creating or paying the invoice does not record that work a second time.
5. **Tax summary** (occasional) — net profit and estimated tax from the income and expense rows, plus recorded bonuses once.

The screens that exist now are login (`SignInPage.tsx` at `/`), register (`RegisterPage.tsx` at `/register`), onboarding, the feed, invoices, and the tax summary. Workplace choice, massage fields, the daily summary, and recipient or period choice stay on the feed page and the invoice page. They are not extra routes.

Optimization priority: step 2 must stay one request per log. Step 3 is a second request only when a photo exists. Steps 4–5 can tolerate a short load.
