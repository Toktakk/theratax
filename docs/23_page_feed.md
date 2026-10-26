# Feed page

Index: [Page plans](20_plan_pages.md). This is items 2 and 3 in [`01_user_flow.md`](01_user_flow.md). The baseline build check is [step 12](14_step12_react_pages.md). Massage fields are [step 14](16_step14_massage_income.md). The bonus is [step 15](17_step15_bonus.md). The daily summary is [step 16](18_step16_daily_income_summary.md). Workplaces are [step 13](15_step13_workplaces.md). A saved client on income is [step 17](19_step17_invoices_from_records.md).

`client/src/pages/FeedPage.tsx` is `/` after onboarding. There is no separate income route. Saved spa, clinic, and client names are [Workplace name](24_page_directory.md).

The file on disk today logs cash income or an expense and can attach a photo. The massage form, the workplace, the bonus, and the daily summary below are the target. Do not add them during step 12.

## Purpose and scope

The feed is the frequent screen. One request logs one income or one expense. A photo, when there is one, is a second request on that row. The same page shows the day's income summary.

Income on this page may be cash (`amountPence` only) or a massage. A massage names a saved workplace or a saved client, a massage type, a base, an additional fee, and a bonus. Expense logging stays as it is. This page does not add an expense feature and does not change mileage.

## User flows and navigation

After onboarding, `/` is this page. The menu also opens [Workplace name](24_page_directory.md), [invoices](25_page_invoice.md), and the [tax summary](27_page_tax_summary.md). Log out returns to [login](21_page_login.md).

On entry, load `GET /expense-categories` once and keep the result. Load `GET /transactions`. When the massage form is present, also load `GET /workplaces` and `GET /clients`. The summary loads with `GET /income/summary` for the selected civil date. Do not call `GET /tax/summary` from this page.

Saving is one `POST /transactions`. The button is disabled while that request is in flight. That is what stops a double submit. There is no idempotency key. After success the form clears and the list reloads. A later press is a new row.

Attaching a photo is optional and happens on the row, not before save. `POST /transactions` never takes a file.

## UI components and layout

The heading is Feed. Under it, show the practice label and the vehicle-method label from onboarding.

The entry card comes before the list. Where Income and Expense appear together, Income comes first:

- The type choices are listed Income, then Expense.
- For one civil date, income rows appear before expense rows. Newer days stay above older days. Do not sort the list again in the browser in a way that puts an expense above an income on the same day.

The daily summary sits with the list for the selected date. It shows base, additional fees, bonus, and the daily total, then the workplace breakdown and the massage-type breakdown.

A row shows the civil date, Income or Expense, the note, and the money as pounds. A massage row also shows the workplace or client name from the loaded lists, the massage name, the base, the additional fee, and the bonus. A mileage row shows the miles next to the money the server calculated. A row with `hasReceipt: false` has a file picker, not a required photo. A row with a receipt shows the image after a fresh link.

## Input fields and field types

Shared:

| On screen | Control | Sent as |
| --- | --- | --- |
| Type | radio, Income then Expense | `type`: `income` or `expense` |
| Date | date input, optional | `occurredOn` as `DD-MM-YYYY`, omitted when blank |
| Note | text, optional | `note`, 1–500 characters when present |

Cash income sends `amountPence` from two fields, whole pounds and pence from 0 to 99. It does not send massage keys.

Massage income, when a massage type is chosen:

| On screen | Control | Sent as |
| --- | --- | --- |
| Workplace or client | one choice | `workplaceId` or `clientId`, not both. Omitted when neither is chosen |
| Massage Type | dropdown | `massageType` |
| Massage type name | text, only when Other is selected | `customMassageType`, 1–100 characters |
| Base Massage Income | pounds and pence | `basePence` |
| Additional Massage Fee | pounds and pence, optional | `additionalFeePence` |
| Bonus | pounds and pence, optional | `bonusPence` |

Massage Type options, in this order. The label is what the user sees. The value is what is stored.

| Label | Value |
| --- | --- |
| Deep Tissue | `deep_tissue` |
| Thai Oil Massage | `thai_oil` |
| Thai Yoga | `thai_yoga` |
| Aroma | `aroma` |
| Pregnancy | `pregnancy` |
| Lymphatic | `lymphatic` |
| Foot Massage | `foot` |
| Swedish | `swedish` |
| Back & Neck | `back_neck` |
| Sport Massage | `sport` |
| Hot Stone | `hot_stone` |
| Body Scrub | `body_scrub` |
| Other | `other` |

Use these labels on the row, in the summary, and on an invoice line. Do not invent a second spelling.

The workplace dropdown lists saved spas and clinics from `GET /workplaces`. Choosing one sends that id. This page does not create a workplace. A new spa or clinic is saved on [Workplace name](24_page_directory.md). Do not create a workplace for every income row. A spa and a clinic may share a display name.

The client dropdown lists `GET /clients`. This page does not create a client. A new client is saved on that same page.

Expense fields stay as they are in step 12. A category dropdown uses the categories the vehicle method allows, in the API's order. Flat-rate mileage asks for miles and does not ask for money. Other expenses ask for money. The hint updates as the note changes and does not call the server. `petrol` under flat rate suggests mileage. The same word under actual cost suggests vehicle costs. `train to clinic` or `uber` suggests Public transport. Parking and tolls stay a user choice of `other`.

Additional Massage Fee and Bonus use GBP. The screen shows £. Different rows can hold different amounts. Leave the field empty when nothing was received. Empty is omitted or sent as `0`. Both mean no increase.

## Validation rules

Convert pounds and pence with integer arithmetic. Pence above 99 is `Enter whole pounds and pence from 0 to 99.` Do not submit that body.

A blank date is omitted. The server fills in today in `Europe/London`. A date outside 6 April 2026 through 5 April 2027 is `400` `Date is outside the 2026-27 tax year`.

Cash income requires an amount of at least 1 pence. Do not send `massageType`, `basePence`, `additionalFeePence`, `bonusPence`, `workplaceId`, or `clientId` on that body.

When Massage Type is set:

- Base is required, an integer from 1 to `100_000_000`. Missing base is `400` `Base amount is required`.
- Additional Massage Fee and Bonus are integers from 0 to `100_000_000`. Omitted means `0`. The response includes `additionalFeePence: 0` and `bonusPence: 0`.
- Other requires `customMassageType`. Missing is `400` `Custom massage type is required`. A custom name on any other type is `400` `Custom massage type is only valid for other`.
- The server sets `amountPence` to base plus additional fee plus bonus. If the form also sends `amountPence`, it must be that sum or the response is `400` `Amount must equal base plus additional fee and bonus`. A sum above `100_000_000` is `400` `Amount is above the maximum`.
- The fee and the bonus are the numbers the user typed. Do not look up a fee from the massage type. Do not multiply hours by a rate.

A massage type, a base, a fee, a bonus, a custom name, a workplace, or a client on an expense is `400`. The messages are `Massage type is only valid on income`, `Additional fee is only valid on massage income`, `Bonus is only valid on massage income`, `Workplace is only valid on income`, and `Client is only valid on income`.

A fee or a bonus without a massage type is `400` with the fee or bonus message above. Cash income does not gain a bonus.

`workplaceId` and `clientId` together are `400` `Income refers to a workplace or a client, not both`. An id the user does not own is `404` `Workplace <id> not found` or `Client <id> not found`. Store the id only. Do not copy the name onto the transaction.

`type` is not accepted on `PATCH`. Sending it is `400` from the pipe.

A photo that is not an image is `400`. The row stays without a receipt. Saving the income row itself still succeeded.

## Business logic and calculations

Total massage income for one row:

`amountPence = basePence + additionalFeePence + bonusPence`

Example: base £60 (`6000`), additional fee £2 (`200`), bonus £5 (`500`). The total is £67 (`6700`). If the bonus is empty or £0, the total is £62 (`6200`). The fee works the same way.

The daily summary is `GET /income/summary` for one civil date. It is computed when the request arrives. There is no stored daily total.

`totalPence = basePence + additionalFeePence + bonusPence` across that day's rows.

- A massage row adds `basePence`, `additionalFeePence`, and `bonusPence` once. Do not also add `amountPence`. That amount is already the three parts.
- Cash income, which has no `basePence`, adds `amountPence` to base and nothing to the fee or the bonus.
- Empty optional amounts count as zero.
- `byWorkplace` has one object per workplace that has income that day. The name and kind come from the `Workplace` row. Income with no workplace stays in the top-level numbers and is absent from `byWorkplace`.
- `byMassageType` includes only rows that have `massageType`. The same type and the same custom text are one bucket. Two custom texts stay two buckets. Each bucket's `totalPence` includes that bucket's bonus. Cash income stays in the top-level base only.
- A row's bonus is in its workplace bucket and in its massage-type bucket. The top-level `bonusPence` still counts it once. Adding `byWorkplace` totals to `byMassageType` totals is not the daily total.

An invoice amount is not part of this summary. Deleting or editing a source row changes the next response. Deleting a massage row removes its base, its fee, and its bonus together, because they are one row.

The tax summary does not read this panel. It sums income `amountPence`, which already includes the bonus. Do not add `bonusPence` a second time anywhere on this page.

## Data models and API dependencies

Income and expense are one `Transaction`. Relevant fields: `type`, `occurredOn`, `amountPence`, `note`, `miles`, `categorySlug`, `massageType`, `customMassageType`, `basePence`, `additionalFeePence`, `bonusPence`, `workplaceId`, `clientId`, `hasReceipt`, `createdAt`, `updatedAt`.

`GET /transactions` orders by `occurredOn` descending, then `type` ascending, then `id` descending. `income` is the first enum value, so income comes first inside one day. `?type=income` and `?type=expense` still filter.

`POST /transactions` returns `201`. Cash income omits the massage keys. A massage response includes `bonusPence` and `additionalFeePence`, including `0`. `hasReceipt` is `false` until a photo is attached. `createdAt` and `updatedAt` are ISO 8601.

`POST /transactions/:id/receipt` is multipart field `file`. Do not set `Content-Type` yourself. `GET /transactions/:id/receipt` returns a `url` that expires in 15 minutes. Do not store that URL in `localStorage`. Opening the row again asks for a new link.

`GET /income/summary?date=DD-MM-YYYY` returns `date`, `basePence`, `additionalFeePence`, `bonusPence`, `totalPence`, `byWorkplace`, and `byMassageType`. An omitted `date` is today in `Europe/London`. An empty day is `200` with every pence field `0` and both arrays empty.

There is no `/hourly-bonuses` call on this page. Bonus is not a separate list.

A transaction that has `invoiceId` is immutable. `PATCH` or `DELETE` is `409` `Invoice income is changed by updating the invoice`. A step 17 source row has no `invoiceId` and stays editable. Issued invoice lines do not follow that edit.

## Loading, empty, success, and error states

- Categories, the list, workplaces, clients, and the summary each show a loading line while their request is in flight.
- An empty list says there is nothing logged yet. The form stays usable. An empty summary shows £0.00 for each total and no breakdown rows.
- Success clears the entry fields, reloads the list and the summary, and focuses the note. The new income row appears above expenses on that day. `hasReceipt` is false. No photo was required.
- A save error shows `FormError` and keeps the typed values. The button is enabled again.
- A list or summary error shows the message and leaves the form usable.
- A rejected file shows the `400` message on that row. The row remains saved.
- A failed workplace or client list shows the message beside the workplace or client choice. The rest of the form stays usable. This page does not save those names.

## Security and data-access considerations

Every request on this page sends the bearer token and requires onboarding. A missing token is `401` and returns to login. Before onboarding the response is `403` `Complete onboarding before using this resource`.

Lists and creates are limited to the token user. Another user's workplace, client, or transaction id is `404`. The page does not send `userId`. Receipt URLs are short-lived and are not a stored credential.

## Acceptance criteria and test scenarios

- One save is one `POST /transactions`. The Network tab has no hint request and no `GET /tax/summary`.
- The submit button does not fire a second POST while the first is in flight.
- Cash income appears with no category and no massage keys. `hasReceipt` is `false`.
- An expense on the same day is listed under that income. A newer day is listed above an older day.
- Income is the first type choice.
- Swedish, base `6000`, fee `200`, bonus `500`, and a saved workplace returns `201`. `amountPence` is `6700`. The three parts are stored separately. The workplace name is not copied onto the row.
- The same body with the bonus omitted returns `bonusPence: 0` and `amountPence` `6200`.
- Body Scrub is accepted as `body_scrub` and shown as Body Scrub.
- Other without a custom name is `400` `Custom massage type is required`. Other with a custom name shows that name.
- A negative fee or a negative bonus is `400` and `message` is an array.
- A massage type on an expense is `400` `Massage type is only valid on income`.
- The same workplace is selected on a second row. The workplace list did not gain a duplicate.
- The summary for that date shows base `6000`, additional fee `200`, bonus `500`, and total `6700`. The workplace breakdown and the Swedish breakdown each include the bonus once. The top-level total is not `13400` and not `7200`.
- An issued invoice does not change the summary.
- Deleting the massage row drops the base, the fee, and the bonus together.
- Save succeeds with no file chosen. A JPEG then appears on the row. A `.txt` file is rejected and the row stays saved.
- `oils` suggests Oils and consumables before save. Mileage still sends miles and not `amountPence`.

## Dependencies on other pages or shared components

Depends on [`26_page_onboarding.md`](26_page_onboarding.md) for `expenseMethod` and the gate, on [`24_page_directory.md`](24_page_directory.md) for saved workplace and client names, and on `api.ts`, `format.ts`, `FormError.tsx`, `hint.ts`, and `category-filter.ts`. The summary figures must match [`25_page_invoice.md`](25_page_invoice.md) and [`27_page_tax_summary.md`](27_page_tax_summary.md) for the same rows. Those pages do not own a second total.
