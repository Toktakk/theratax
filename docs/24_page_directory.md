# Workplace name page

Index: [Page plans](20_plan_pages.md). Saving a workplace is [step 13](15_step13_workplaces.md). Saving a client is [step 17](19_step17_invoices_from_records.md). The feed still chooses a saved name. It does not create one.

`client/src/pages/DirectoryPage.tsx` is `/workplaces` after onboarding. The menu label is Workplace name.

## Purpose and scope

This page saves a spa, a clinic, or a client once, then other pages reuse the id. It lists the names already saved and adds a new one. It does not log income, issue an invoice, rename a row, or delete a row.

The [feed](23_page_feed.md) only chooses a saved workplace or client. The [invoice page](25_page_invoice.md) can still save a name while issuing a bill, with the same create requests.

## User flows and navigation

Open Workplace name from the menu after onboarding. On entry, load `GET /workplaces?limit=100` and `GET /clients?limit=100`.

Saving a workplace is `POST /workplaces` with `{ name, kind }`. Saving a client is `POST /clients` with `{ name }`. Each button is disabled while its request is in flight. After success the name field clears and the new row appears in that list, ordered by name, then id. A later press with the same name is a new request and gets `409`.

The feed and the invoice page keep their own copies of these lists. Opening one of those pages loads the names again.

## UI components and layout

The heading is Workplace name. Two cards follow, Workplaces then Clients.

Each card shows a loading line while its request is in flight, then the saved rows in the order the list response sent them. A workplace row shows the name and Spa or Clinic. A client row shows the name. An empty list says there is nothing saved yet. The save form sits under that list.

`SaveWorkplaceForm` asks for a name and a kind, Spa or Clinic. `SaveClientForm` asks for a name. Both live in `client/src/directory-forms.tsx`. The invoice page uses the same forms.

If `total` is greater than the number of rows loaded, the card says how many of the total are showing. This page does not page further.

## Input fields and field types

| On screen | Control | Sent as |
| --- | --- | --- |
| Workplace name | text, 1–200 characters after trim | `name` |
| Kind | Spa or Clinic | `kind`: `spa` or `clinic` |
| Client name | text, 1–200 characters after trim | `name` |

A name that is only spaces is `400` `Name is required`. `kind` other than `spa` or `clinic` is `400` and `message` is an array. The same user, the same kind, and the same workplace name ignoring case is `409` `Workplace already saved`. A spa and a clinic may share a display name. The same client name ignoring case is `409` `Client already saved`. Show the server message. Do not add a second row.

## Data models and API dependencies

`POST /workplaces` returns `201` with `id`, `name`, `kind`, `createdAt`, and `updatedAt`. It does not return `userId`. `GET /workplaces` uses the list envelope, ordered by `name` ascending, then `id` ascending, and only this user's rows.

`POST /clients` returns `201` with `id`, `name`, `createdAt`, and `updatedAt`. `GET /clients` uses the same envelope and the same order. There is no rename or delete control on this page.

## Loading, empty, success, and error states

- Each list shows a loading line while its request is in flight.
- An empty workplace list says no workplaces are saved yet. An empty client list says no clients are saved yet. The forms stay usable.
- Success clears that form's name and inserts the new row. The kind control stays as the user left it.
- A save error shows `FormError` on that form and keeps the typed name.
- A list error shows `FormError` on that card. The other card still loads.

## Security and data-access considerations

Every request sends the bearer token and requires onboarding. A missing token is `401` and returns to login. Before onboarding this route is not in the menu, and the response is `403` `Complete onboarding before using this resource`.

Lists and creates are limited to the token user. The page does not send `userId`.

## Acceptance criteria and test scenarios

- The menu after onboarding shows Workplace name between Feed and Invoices. The route is `/workplaces`.
- Saving `North Spa` as a spa returns `201` and the row shows `North Spa · Spa`. The name field is empty again.
- Saving `north spa` as a spa shows `Workplace already saved` and does not add a second row.
- Saving `North Spa` as a clinic returns `201`. A spa and a clinic may share the display name.
- Saving `Ada Client`, then `ada client`, shows `Client already saved` on the second save.
- The feed's massage dropdown lists those names and has no save form. The invoice page can still save a name and select it.
- A list whose `total` is above the loaded rows says how many are showing.

## Dependencies on other pages or shared components

Depends on the menu in `App.tsx`, on `api.ts`, `FormError.tsx`, and `directory-forms.tsx`. The feed and the invoice page read the same rows by id. This page does not copy a name onto a transaction or an invoice.
