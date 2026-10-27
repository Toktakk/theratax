# Workplace name page

Index: [Page plans](20_plan_pages.md). Saving a workplace is [step 13](15_step13_workplaces.md). Saving a client is [step 17](19_step17_invoices_from_records.md). The feed still chooses a saved name. It does not create one.

`client/src/pages/DirectoryPage.tsx` is `/workplaces` after onboarding. The menu label is Workplace name.

## Purpose and scope

This page saves a spa, a clinic, or a client once, with an hour rate, then other pages reuse the id. It lists the names already saved, adds a new one, and edits a saved name, hour rate, and treatment extras. It does not log income, issue an invoice, or delete a row.

The [feed](23_page_feed.md) only chooses a saved workplace or client. The [invoice page](25_page_invoice.md) can still save a name while issuing a bill, with the same create requests.

## User flows and navigation

Open Workplace name from the menu after onboarding. On entry, load `GET /workplaces?limit=100` and `GET /clients?limit=100`.

Saving a workplace is `POST /workplaces` with `{ name, kind, hourRatePence, hourExtras? }`. Saving a client is `POST /clients` with `{ name, hourRatePence, hourExtras? }`. Editing a workplace is `PATCH /workplaces/:id` with `{ name, hourRatePence, hourExtras }`. Editing a client is `PATCH /clients/:id` with `{ name, hourRatePence, hourExtras }`. Each button is disabled while its request is in flight. After a successful save the name, hour rate, and extras clear and the new row appears in that list, ordered by name, then id. A later press with the same name is a new request and gets `409`. After a successful edit the row shows the saved name and rate, in that same order. Cancel closes the editor and does not send a request.

The feed and the invoice page keep their own copies of these lists. Opening one of those pages loads the names again.

## UI components and layout

The heading is Workplace name. Two cards follow, Workplaces then Clients.

Each card shows a loading line while its request is in flight, then the saved rows in the order the list response sent them. A workplace row shows the name, Spa or Clinic, and the hour rate, for example `ร้าน เอ · Spa · £25.00/hour · pregnancy +£2.00/hour · body scrub +£5.00/hour · request +£2.00/hour`. A client row shows the name and the same rate text. An empty extra list leaves only the hour rate. Each row has Edit. An empty list says there is nothing saved yet. The save form sits under that list.

`SaveWorkplaceForm` asks for a name, an hour rate, treatment extras, and a kind, Spa or Clinic. `SaveClientForm` asks for a name, an hour rate, and the same extras. Edit uses those same fields and shows a workplace kind as text. Kind is not sent on edit. Both live in `client/src/directory-forms.tsx`. The invoice page uses the same create forms and does not edit a saved row.

If `total` is greater than the number of rows loaded, the card says how many of the total are showing. This page does not page further.

## Input fields and field types

| On screen | Control | Sent as |
| --- | --- | --- |
| Workplace name | text, 1–200 characters after trim | `name` |
| Hour rate | pounds and pence, required, at least 1 pence | `hourRatePence` |
| Extra per hour | one or more rows: Pregnancy, Hot Stone, Body Scrub, Request, or Other | `hourExtras`: `{ massageType, customMassageType?, extraPence }[]` |
| Kind | Spa or Clinic, only when saving a workplace | `kind`: `spa` or `clinic` |
| Client name | text, 1–200 characters after trim | `name` |

A name that is only spaces is `400` `Name is required`. `kind` other than `spa` or `clinic` is `400` and `message` is an array. The same user, the same kind, and the same workplace name ignoring case is `409` `Workplace already saved`. A spa and a clinic may share a display name. The same client name ignoring case is `409` `Client already saved`. Show the server message. Do not add a second row.

Each extra is at least 1 pence. Other requires a treatment name. The same massage type twice, or the same Other name ignoring case, is `400` `Hour extra already set for this massage type`. A custom name on any other type is `400` `Custom massage type is only valid for other`. The row text orders extras as pregnancy, hot stone, body scrub, request, then other by name.

## Data models and API dependencies

`POST /workplaces` returns `201` with `id`, `name`, `kind`, `hourRatePence`, `hourExtras`, `createdAt`, and `updatedAt`. It does not return `userId`. `PATCH /workplaces/:id` returns `200` with the same shape. `GET /workplaces` uses the list envelope, ordered by `name` ascending, then `id` ascending, and only this user's rows.

`POST /clients` returns `201` with `id`, `name`, `hourRatePence`, `hourExtras`, `createdAt`, and `updatedAt`. `PATCH /clients/:id` returns `200`. `GET /clients` uses the same envelope and the same order. A rename does not change `recipientName` on an invoice already issued. Past income keeps the `basePence` stored on the transaction.

## Loading, empty, success, and error states

- Each list shows a loading line while its request is in flight.
- An empty workplace list says no workplaces are saved yet. An empty client list says no clients are saved yet. The forms stay usable.
- Success clears that form's name, hour rate, and extras, and inserts the new row. The kind control stays as the user left it.
- Edit success replaces that row and closes the editor. Edit failure keeps the typed name and shows `FormError`.
- A save error shows `FormError` on that form and keeps the typed name.
- A list error shows `FormError` on that card. The other card still loads.

## Security and data-access considerations

Every request sends the bearer token and requires onboarding. A missing token is `401` and returns to login. Before onboarding this route is not in the menu, and the response is `403` `Complete onboarding before using this resource`.

Lists and creates are limited to the token user. The page does not send `userId`.

## Acceptance criteria and test scenarios

- The menu after onboarding shows Workplace name between Feed and Invoices. The route is `/workplaces`.
- Saving `North Spa` as a spa at £25 per hour, with pregnancy +£2, request +£2, and body scrub +£5, returns `201`. The row shows `North Spa · Spa · £25.00/hour · pregnancy +£2.00/hour · body scrub +£5.00/hour · request +£2.00/hour`. The name, hour rate, and extras are empty again.
- Edit changes that spa's name or hour rate, and the row shows the saved values. A duplicate name shows `Workplace already saved` and does not add a second row.
- Saving `north spa` as a spa shows `Workplace already saved` and does not add a second row.
- Saving `North Spa` as a clinic returns `201`. A spa and a clinic may share the display name.
- Saving `Ada Client`, then `ada client`, shows `Client already saved` on the second save.
- The feed's massage dropdown lists those names and has no save form. The invoice page can still save a name and select it.
- A list whose `total` is above the loaded rows says how many are showing.

## Dependencies on other pages or shared components

Depends on the menu in `App.tsx`, on `api.ts`, `FormError.tsx`, and `directory-forms.tsx`. The feed and the invoice page read the same rows by id. This page does not copy a name onto a transaction or an invoice.
