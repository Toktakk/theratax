# Feed page

Index: [Page plans](20_plan_pages.md). This is items 2 and 3 in [`01_user_flow.md`](01_user_flow.md). The baseline build check is [step 12](14_step12_react_pages.md). Massage fields are [step 14](16_step14_massage_income.md). The bonus is [step 15](17_step15_bonus.md). The daily summary is [step 16](18_step16_daily_income_summary.md). Workplaces are [step 13](15_step13_workplaces.md). A saved client on income is [step 17](19_step17_invoices_from_records.md).

`client/src/pages/FeedPage.tsx` is `/` after onboarding. There is no separate income route. Saved spa, clinic, and client names are [Workplace name](24_page_directory.md).

The file on disk today logs cash income or an expense and can attach a photo. The massage form, the workplace, the bonus, and the daily summary below are the target. Do not add them during step 12.

## Purpose and scope

The feed is the frequent screen. One request logs one income or one expense. A photo, when there is one, is a second request on that row. The same page shows the day's income summary.

Income on this page may be cash (`amountPence` only) or a massage. A massage names a saved workplace or a saved client, a massage type, hours, an additional fee, and a bonus. The base is hours times that workplace or client hour rate. Expense logging stays as it is. This page does not add an expense feature and does not change mileage.

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

A row shows the civil date, Income or Expense, the note, and the money as pounds. A massage row also shows the workplace or client name from the loaded lists, the massage name, the hours, the computed base, the additional fee, and the bonus. A mileage row shows the miles next to the money the server calculated. A row with `hasReceipt: false` has a file picker, not a required photo. The browser may fill that file from the camera. A payment slip is this same photo. A row with a receipt shows the image after a fresh link.

On a massage entry the field order is type, date, massage type, workplace or client, the custom name when Other is selected, Hours, Additional Massage Fee, Bonus, then Note. Expense and cash income keep Note at the bottom of the form, after the amount or the miles, and the expense hint stays under that note.

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
| Hours | decimal, up to two places, whole minutes | `minutes`. `2` is 120. `1.5` is 90. The server sets `basePence` |
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

Hours use the selected workplace or client. Pregnancy adds that row's `pregnancyExtraPence` to `hourRatePence` before multiplying. Two hours at £25, with a £2 pregnancy extra, is £54 when the type is Pregnancy and £50 for any other type. The line under Hours shows that product, for example `2 hours × £27.00 = £54.00`. No selection, or a rate of 0, does not multiply and tells the user to set an hour rate on Workplace name.

Additional Massage Fee and Bonus use GBP. The screen shows £. Different rows can hold different amounts. Leave the field empty when nothing was received. Empty is omitted or sent as `0`. Both mean no increase.

While hours are filled, the daily summary card adds this unsaved base, fee, and bonus onto the loaded totals for the selected date. Saving clears the form and reloads the summary, so the same row is not added twice.

## Validation rules

Convert pounds and pence with integer arithmetic. Pence above 99 is `Enter whole pounds and pence from 0 to 99.` Do not submit that body.

A blank date is omitted. The server fills in today in `Europe/London`. A date outside 6 April 2026 through 5 April 2027 is `400` `Date is outside the 2026-27 tax year`.

Cash income requires an amount of at least 1 pence. Do not send `massageType`, `basePence`, `additionalFeePence`, `bonusPence`, `workplaceId`, or `clientId` on that body.

When Massage Type is set:

- Hours are required. The screen sends `minutes`, an integer from 1 to `1_000_000`. The server sets `basePence` from the selected hour rate. A missing workplace and client is `400` `A workplace or a client is required`. A rate of 0 is `400` `Hour rate is required`. A computed base below 1 pence is `400` `Base amount is required`.
- Additional Massage Fee and Bonus are integers from 0 to `100_000_000`. Omitted means `0`. The response includes `additionalFeePence: 0` and `bonusPence: 0`.
- Other requires `customMassageType`. Missing is `400` `Custom massage type is required`. A custom name on any other type is `400` `Custom massage type is only valid for other`.
- The server sets `amountPence` to base plus additional fee plus bonus. If the form also sends `amountPence`, it must be that sum or the response is `400` `Amount must equal base plus additional fee and bonus` when the bonus is greater than 0. A sum above `100_000_000` is `400` `Amount is above the maximum`.
- The fee and the bonus are the numbers the user typed. Do not look up a fee from the massage type. Do multiply the hours by the workplace or client hour rate. Pregnancy is the only type that changes that rate, and it adds the stored pregnancy extra.

A massage type, a base, a fee, a bonus, a custom name, a workplace, or a client on an expense is `400`. The messages are `Massage type is only valid on income`, `Additional fee is only valid on massage income`, `Bonus is only valid on massage income`, `Workplace is only valid on income`, and `Client is only valid on income`.

A fee or a bonus without a massage type is `400` with the fee or bonus message above. Cash income does not gain a bonus.

`workplaceId` and `clientId` together are `400` `Income refers to a workplace or a client, not both`. An id the user does not own is `404` `Workplace <id> not found` or `Client <id> not found`. Store the id only. Do not copy the name onto the transaction.

`type` is not accepted on `PATCH`. Sending it is `400` from the pipe.

A photo whose bytes are not a complete JPEG, PNG, or WebP is `400`. The row stays without a receipt. Saving the income row itself still succeeded. A camera blob is still the multipart field `file`.

## Business logic and calculations

Total massage income for one row:

`basePence = floor((minutes * effectiveRatePence + 30) / 60)`

`amountPence = basePence + additionalFeePence + bonusPence`

Shop A stores £25 per hour (`2500`) and a £2 pregnancy extra (`200`). Two hours (`minutes` `120`) of Pregnancy is a £27 rate and a base of £54 (`5400`). The same two hours of Swedish stay at £25 and a base of £50 (`5000`). An additional fee of £2 (`200`) and a bonus of £5 (`500`) on the pregnancy row make the total £61 (`6100`). An empty fee or bonus adds nothing.

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

Income and expense are one `Transaction`. Relevant fields: `type`, `occurredOn`, `amountPence`, `note`, `miles`, `categorySlug`, `massageType`, `customMassageType`, `basePence`, `additionalFeePence`, `bonusPence`, `minutes`, `workplaceId`, `clientId`, `hasReceipt`, `createdAt`, `updatedAt`.

`GET /transactions` orders by `occurredOn` descending, then `type` ascending, then `id` descending. `income` is the first enum value, so income comes first inside one day. `?type=income` and `?type=expense` still filter.

`POST /transactions` returns `201`. Cash income omits the massage keys. A massage response includes `bonusPence` and `additionalFeePence`, including `0`. `hasReceipt` is `false` until a photo is attached. `createdAt` and `updatedAt` are ISO 8601.

`POST /transactions/:id/receipt` is multipart field `file`. A camera capture and a file picker both use that field. A payment slip uses it too. Do not set `Content-Type` yourself. Do not send a filesystem path. `GET /transactions/:id/receipt` returns a `url` that expires in 15 minutes. Do not store that URL in `localStorage`. Opening the row again asks for a new link. `hasReceipt` is how the row knows a photo is saved. The list has no file URL.

`GET /income/summary?date=DD-MM-YYYY` returns `date`, `basePence`, `additionalFeePence`, `bonusPence`, `totalPence`, `byWorkplace`, and `byMassageType`. An omitted `date` is today in `Europe/London`. An empty day is `200` with every pence field `0` and both arrays empty.

There is no `/hourly-bonuses` call on this page. Bonus is not a separate list.

A transaction that has `invoiceId` is immutable. `PATCH` or `DELETE` is `409` `Invoice income is changed by updating the invoice`. A step 17 source row has no `invoiceId` and stays editable. Issued invoice lines do not follow that edit.

## Loading, empty, success, and error states

- Categories, the list, workplaces, clients, and the summary each show a loading line while their request is in flight.
- An empty list says there is nothing logged yet. The form stays usable. An empty summary shows £0.00 for each total and no breakdown rows.
- Success clears the entry fields, reloads the list and the summary, and focuses the note. The new income row appears above expenses on that day. `hasReceipt` is false. No photo was required.
- A save error shows `FormError` and keeps the typed values. The button is enabled again.
- A list or summary error shows the message and leaves the form usable.
- A rejected file shows the `400` message on that row. The row remains saved. A storage failure shows the `500` message. The row gains a photo only after `201`.
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
- Swedish, `minutes` `120`, at a workplace whose hour rate is `2500`, fee `200`, and bonus `500` returns `201`. `basePence` is `5000`. `amountPence` is `5700`. Pregnancy at the same workplace with `pregnancyExtraPence` `200` returns `basePence` `5400`. The workplace name is not copied onto the row.
- The same body with the bonus omitted returns `bonusPence: 0` and `amountPence` `5200`.
- Body Scrub is accepted as `body_scrub` and shown as Body Scrub.
- Other without a custom name is `400` `Custom massage type is required`. Other with a custom name shows that name.
- A negative fee or a negative bonus is `400` and `message` is an array.
- A massage type on an expense is `400` `Massage type is only valid on income`.
- The same workplace is selected on a second row. The workplace list did not gain a duplicate.
- The summary for that date shows base `5000`, additional fee `200`, bonus `500`, and total `5700`. The workplace breakdown and the Swedish breakdown each include the bonus once. The top-level total is not `11400` and not `5200`.
- An issued invoice does not change the summary.
- Deleting the massage row drops the base, the fee, and the bonus together.
- Save succeeds with no file chosen. A JPEG then appears on the row. A camera photo uses that same upload. A `.txt` file is rejected and the row stays saved.
- `oils` suggests Oils and consumables before save. Mileage still sends miles and not `amountPence`.

## Dependencies on other pages or shared components

Depends on [`26_page_onboarding.md`](26_page_onboarding.md) for `expenseMethod` and the gate, on [`24_page_directory.md`](24_page_directory.md) for saved workplace and client names, and on `api.ts`, `format.ts`, `FormError.tsx`, `hint.ts`, and `category-filter.ts`. The summary figures must match [`25_page_invoice.md`](25_page_invoice.md) and [`27_page_tax_summary.md`](27_page_tax_summary.md) for the same rows. Those pages do not own a second total.
