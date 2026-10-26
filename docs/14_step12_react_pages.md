# Step 12 — React pages

Guide: [Project plan](02_project_plans.md). Previous: [Step 11 — Invoices and PDF](13_step11_invoices_and_pdf.md).

## Why this step comes last

The web page is a client of the contract. If you draw a page before that step's Postman request passes, a button breaks and you cannot tell whether it broke in the form or in the API. Build one page at a time, following [`01_user_flow.md`](01_user_flow.md). Check it in the browser and finish the current page before you create the next page's files.

A sign-in page sits in front of all five flow items, because without a token you cannot call onboarding. It is not an item in the user flow. It is the door of the API.

Flow items 2 and 3 are used between every client. They must finish in one request per log, and one more request when there is a photo. Do not make those two pages wait for the tax summary or for PDF generation. Items 4 and 5 happen rarely. They may take longer to load.

## Not in this step

Do not add a Nest endpoint, except opening CORS for the origin `http://localhost:5173`. Opening CORS is not a business domain. It lets a browser on a different port send `Authorization`, because that header makes the browser send a preflight.

In `bootstrap`, before `listen`

```ts
app.enableCors({ origin: 'http://localhost:5173' });
```

Do not do Phase 2. Do not build a chart-of-accounts page, and do not build a page that changes `expenseMethod` after onboarding.

## Concept

The new app lives in the folder `client/`. Create it with Vite, React, and TypeScript. Install only when you reach this step, from the repo root.

```bash
npm create vite@latest client -- --template react-ts
npm install --prefix client react-router-dom
```

Run the API on port 3000 and the web page on port 5173 at the same time.

```bash
npm run start:dev
npm run dev --prefix client
```

The API address is the constant `http://localhost:3000`. There is no `/api` prefix.

The helper `client/src/api.ts` reads `accessToken` from `localStorage` and puts the header `Authorization: Bearer` on every request, except register and login, which do not have a token yet. If the response is not successful, read `message` in both shapes: join an array into text a person can read, and show a string as it is. If you get `401` while an old token is stored, delete the token and go back to the sign-in page.

Do not set `Content-Type` yourself when sending `FormData`. The browser has to put the multipart boundary on it.

Money on the screen is pounds. Two separate fields are whole pounds and pence from 0 to 99. Convert to pence by multiplying integers. Do not use `Number("65.10") * 100`, because floating point can move a penny.

When the app opens, if there is no token, show the sign-in page. If there is one, call `GET /users/me`. If `onboardedAt` is `null`, show only the onboarding page. If it has a value, enter the feed. The invoice page and the tax summary page sit in the menu behind this gate.

## Sign-in page

The files for this stretch are only `client/src/api.ts`, `client/src/pages/SignInPage.tsx`, and the wiring in `client/src/App.tsx`. Do not create the onboarding page yet.

The register form has email, password, and name. The login form has email and password. A password shorter than 8 characters shows the array the pipe sent. A duplicate email shows `Email already registered`. A wrong password shows `Invalid email or password`, without guessing which part was wrong.

When you receive `accessToken`, store it, then call `GET /users/me`.

Check in the browser: register a new user, and see that the request is `201` on the Network tab. Refresh the page and you are still signed in, because the token was read back and `GET /users/me` got `200`. Log out, and this page can no longer fire `GET /users/me` without a token. The page must return to the form.

**Pass this page, then build the next one.**

## Onboarding page

This is flow item 1. It happens once.

The two choices the user sees must map onto the contract exactly.

| On screen | Value sent |
| --- | --- |
| Travels to the client | `practiceType: mobile` |
| Clinic | `practiceType: fixedLocation` |
| Both | `practiceType: mixed` |
| Single-rate mileage | `expenseMethod: flat_rate` |
| Vehicle costs as actually paid | `expenseMethod: actual_cost` |

Next to the vehicle-method choice, write that this method applies to the car only. Massage oils, HCPC fees, insurance, and laundry are still typed as amounts. After flat rate is chosen it cannot be changed back, because the API returns `409`.

Send `PATCH /users/me/onboarding` once. On success, `onboardedAt` is not `null`, and you enter the feed. A user who is already onboarded must not see this form again when they open the app.

Check: register a new account. You must be stuck on this page before you see the feed. Choose travels to the client and single-rate mileage, and an empty feed can appear. Refresh, and you are still on the feed. If you call onboarding again from the developer tools, the page must show `Onboarding already completed` when it receives 409.

**Pass this page, then build the next one.**

## Feed

This is flow item 2. The new files are the feed page, the category filter, and `client/src/hint.ts`. Do not add an attach-photo button yet, and do not build the invoice page.

When you enter the feed, call `GET /expense-categories` once, then keep the result. Filter categories by the user's `expenseMethod`.

- `flat_rate` keeps kind `general` and `mileage`
- `actual_cost` keeps kind `general` and `vehicle_actual`

There is no hint endpoint. Follow this in the browser every time the note changes.

1. Use only the categories the vehicle method allows, in the order of the array the API sent.
2. Lowercase the note. The first category whose keyword is a substring of the note is the suggestion.
3. An empty note, or no matching word, leaves the choice to the user. `other` has no keywords, so it is never suggested.

The word `petrol` under flat rate must suggest `mileage`, and the form asks for miles, not an amount, because the server calculates it. Under actual cost the same word must suggest `vehicle-costs`, and the form asks for money. The note `train to clinic` or `uber` suggests Public transport, and the form asks for money under either vehicle method. Parking and tolls are chosen by the user as `other`, then they type the money.

Saving is a single `POST /transactions`. The day can be left blank. The server fills in today's London date. The list calls `GET /transactions` with the newest row on top. Show money as pounds from `amountPence`. A mileage row shows the miles next to the money the server calculated. A row whose `hasReceipt` is `false` has no photo button on this page.

Check the Network tab while logging one row: there is one `POST /transactions`, no request to a hint path, and no `GET /tax/summary`. Cash income appears on the feed with no category. Type `oils` and the suggestion is Oils and consumables before you press save.

**Pass this page, then build the next one.**

## Attach a photo

This is flow item 3. It stays on the feed row. Do not open a new page that takes several clicks, because this step has to be fast.

A row whose `hasReceipt` is `false` has a file picker. When a file is chosen, `POST /transactions/:id/receipt` with the field `file` immediately. Then `GET /transactions/:id/receipt` and put `url` into the `src` of an `<img>`. Do not store the URL in `localStorage`, because it expires in 15 minutes. Opening the same row again asks for a new link.

A file that is not an image shows the `400` message, and the row stays in the no-receipt state.

Check: choose a JPEG and see the picture in the row. Refresh, ask for a new link, and still see the picture. Choose a `.txt` file and see the rejection message. While you do both of those, the Network tab still has no tax-summary request and no PDF request.

**Pass this page, then build the next one.**

## Invoice page

This is flow item 4. The form has the client name, the service, pounds, pence, and an issue date that can be left blank.

Pressing create calls only `POST /invoices`. Do not follow it with `POST /transactions`. The invoice list shows the number, status `issued`, and no paid date yet. The feed does not gain income.

The PDF button calls `GET /invoices/:id/pdf` and lets the browser download using the filename in `Content-Disposition`. The pay button calls `PATCH` with `{ "status": "paid" }`. After success the invoice row has `transactionId`, and the feed has income whose note is the invoice number.

Check the three states in order: before pay, the feed and the `incomePence` you already knew do not move, because of the invoice alone; download the PDF and open it to see the name, the number, the client, the service, and the amount; after pay, the feed has income of the same amount. Press pay again and see `Invoice is already paid`.

**Pass this page, then build the next one.**

## Tax summary page

This is flow item 5. Call `GET /tax/summary` only when this page opens. Do not call it again every time someone types in the feed.

Show the range from `periodStart` to `periodEnd`, the vehicle method, income, allowable expenses, `netProfitPence` even when it is negative, estimated tax from `estimatedTaxOwedPence`, and a Class 2 line. If `treatedAsPaid` is true, say it is treated as paid. If it is not, show the voluntary rate from `voluntaryWeeklyPence`, and do not add it into the estimated tax.

Show all six `assumptions` in order, and the whole `disclaimer` sentence exactly as the API sent it.

Check: the numbers on the page match the Postman request for the same user. An unpaid invoice does not move the total. After you go back and pay on the invoice page, then open this page again, income rises by the amount on that invoice. The feed page can still log a row without waiting for this page to load.

**Pass this page. The lesson is finished.**

## If it fails

- The browser reports CORS: `enableCors` is not set for `http://localhost:5173`, or the API was not restarted.
- Every request after login gets 401: the token is stored, but the helper forgot to put `Bearer ` with the space.
- After uploading an image the server does not see the file: `Content-Type: application/json` was set over the `FormData`.
- The hint fires a request: someone created a hint path on the API. Remove that call. The suggestion comes from the keywords in memory.
- Logging miles shows an amount of 0: the form is still sending `amountPence` together with `miles`. On the flat-rate side, send only `miles`.
- Creating an invoice puts income on the feed immediately: the invoice page also fired `POST /transactions`. Leave only `POST /invoices` until pay is pressed.
- The tax numbers on the page do not match the Postman request: the page calculated a rate itself. Show the numbers from `GET /tax/summary` as they are.
