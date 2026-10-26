# Tax summary page

Index: [Page plans](20_plan_pages.md). This is item 5 in [`01_user_flow.md`](01_user_flow.md). The build check is [step 12](14_step12_react_pages.md). The figures come from [step 9](11_step09_tax_summary.md) and [`api-spec.md`](api-spec.md).

## Purpose and scope

`client/src/pages/TaxSummaryPage.tsx` is `/tax`. It shows the signed-in user's estimated tax for 2026–27. It appears in the menu only after onboarding.

The page displays the JSON from `GET /tax/summary`. It does not recompute rates. It does not add a bonus, a base, or an invoice total of its own.

## User flows and navigation

Open the page from the menu. The request runs when the page opens. Typing on the feed must not call this endpoint.

Go back to the feed or to invoices with the menu. Log out returns to login.

An unpaid invoice does not move the numbers. Income moves when an income row's `amountPence` changes, including a massage row whose amount already includes the additional fee and the bonus.

## UI components and layout

The heading is Tax summary. Show, in this order:

- The range from `periodStart` to `periodEnd`.
- The vehicle method, using the same labels as onboarding: Single-rate mileage or Vehicle costs as actually paid.
- Income, from `incomePence`, as pounds.
- Allowable expenses, from `allowableExpensesPence`.
- Net profit, from `netProfitPence`, including when it is negative.
- Estimated tax, from `estimatedTaxOwedPence`.
- A Class 2 line. If `treatedAsPaid` is true, say it is treated as paid. If it is not, show the voluntary rate from `voluntaryWeeklyPence`. Do not add that rate into the estimated tax.
- All six `assumptions`, in the order the API sent them.
- The whole `disclaimer` sentence, exactly as the API sent it.

Use `formatPounds` for money. Do not round again.

## Input fields and field types

This page has no form. The optional query `taxYear` is omitted. The server uses the tax year that contains today in `Europe/London`. This product only supports 2026–27. Another year is `400`, and the page shows that message.

## Validation rules

There is no client validation. A `400` or `403` is shown as the server message.

## Business logic and calculations

Do not multiply by 20, 40, 45, 6, or 2 on this page. Do not add `basePence`, `additionalFeePence`, or `bonusPence` beside `incomePence`.

`incomePence` is already the sum of income `amountPence` for the year. For a massage row that amount is base plus additional fee plus bonus, so the bonus is inside `incomePence` once. The page must not add it again. The handler must not add it again either. That rule is [step 16](18_step16_daily_income_summary.md).

`estimatedTaxOwedPence` is income tax plus Class 4. Class 2 is not inside it. A loss stays visible on `netProfitPence`. Tax uses `taxableProfitPence`, which is not negative.

Invoice `amountPence` is not added. A step 17 invoice does not create an income row, so paying it does not raise this page. A step 11 income row that already exists still counts through `amountPence`.

## Data models and API dependencies

`GET /tax/summary` with the bearer token, only when this page opens. The body is the `TaxSummary` in [`api-spec.md`](api-spec.md): `taxYear`, `periodStart`, `periodEnd`, `expenseMethod`, the pence fields, `class2`, `assumptions`, and `disclaimer`.

The pure function is `calculateTaxSummary`. The page never calls it. The handler loads the two sums and calls it.

## Loading, empty, success, and error states

- Before the response, show a loading line. Do not show zeros that look like a finished estimate.
- Success shows the fields above, including a genuine zero.
- Failure shows `FormError` and does not show a partial estimate.
- A user with no rows still gets `200`. The pence fields are 0 and the assumptions and disclaimer are still shown.

## Security and data-access considerations

The request requires a bearer token and a completed onboarding. Another user's rows are not in the response. The page has no user id field. A `401` returns to login. A `403` `Complete onboarding before using this resource` means this menu was opened too early. Onboarding is supposed to block that.

## Acceptance criteria and test scenarios

- The numbers match a Postman `GET /tax/summary` for the same user. They do not match a total the page computed itself.
- The feed can log a row without waiting for this page to load. This page's request is absent from that Network tab.
- An unpaid invoice does not change `incomePence`.
- A massage row of base `6000`, additional fee `200`, and bonus `500` raises `incomePence` by `6700`, not by `6200` and not by `7200`.
- Deleting that row lowers `incomePence` by `6700`.
- `treatedAsPaid: false` shows `voluntaryWeeklyPence` and leaves `estimatedTaxOwedPence` unchanged by that weekly figure.
- All six assumptions and the disclaimer match the response text.
- A negative `netProfitPence` is shown as a loss, not hidden.

## Dependencies on other pages or shared components

Depends on the menu in `App.tsx`, on `format.ts` and `FormError.tsx`, and on income saved from [`23_page_feed.md`](23_page_feed.md). It does not read the invoice list. The vehicle label matches [`26_page_onboarding.md`](26_page_onboarding.md).
