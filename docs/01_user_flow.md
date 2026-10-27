# TheraTax — Therapist User Flow

1. **Onboarding** (one-time) — choose business type, Flat Rate vs Actual Cost
2. **Feed** (fast, frequent) — log income or an expense in one request. Massage income can name a saved spa or clinic, a massage type, a base amount, an additional fee, a bonus the user types, and a note. A photo is not required. The same feed lists income before expenses. The daily summary adds base, additional fees, and bonuses once. Total massage income is base plus additional fee plus bonus.
3. **Attach receipt** (optional) — one photo of a receipt or a payment slip, linked to that transaction in a second request, when there is a photo. A camera capture and a file picker send the same image. Expenses can still use it. Income can be saved with no image.
4. **Create invoice** (occasional) — choose a saved spa, clinic, or client, and a day or a month. The bill is built from the income rows for that recipient and period, including each row's additional fee and bonus once, then exported as a PDF. Creating or paying the invoice does not record that work a second time.
5. **Tax summary** (occasional) — net profit and estimated tax from the income and expense rows. A bonus is already inside the income amount, so it is not added again.

The screens are login (`SignInPage.tsx` at `/`), register (`RegisterPage.tsx` at `/register`), onboarding, the feed, workplace names (`DirectoryPage.tsx` at `/workplaces`), invoices, the tax summary, and the profile (`ProfilePage.tsx` at `/profile`). The profile shows the account and corrects the business address. Massage fields, the bonus, the daily summary, and recipient or period choice stay on the feed page and the invoice page. Saving a spa, a clinic, or a client name is the Workplace name page. The invoice page can still save a name while issuing a bill. The page index is [`20_plan_pages.md`](20_plan_pages.md).

Optimization priority: step 2 must stay one request per log. Step 3 is a second request only when a photo exists. Steps 4–5 can tolerate a short load.
