# Profile page

Index: [Page plans](20_plan_pages.md). The address contract is the Business address section of [`api-spec.md`](api-spec.md). The first address is saved on [onboarding](26_page_onboarding.md).

## Purpose and scope

`client/src/pages/ProfilePage.tsx` is `/profile`. It shows the signed-in account and lets that user correct the business address used on later invoices. It appears in the menu only after onboarding.

Name, email, practice type, and vehicle method are shown and are not edited here. Onboarding stays one-time. This page does not call `PATCH /users/me/onboarding`.

## User flows and navigation

Open Profile from the menu. The account and the current address come from the session user. The page does not call `GET /users/me` again.

Save calls `PATCH /users/me/address`. On `200` the session user is replaced, the form shows the stored address, and the page says `Address saved.` Open [Invoices](25_page_invoice.md) and the business-address line matches that save. Invoices already issued keep the address copied at issue time.

A blank address line 2 is omitted from the body, so a second line that was stored is cleared. The form then shows that line empty.

While `onboardedAt` is `null`, this route is not in the menu. Log out returns to [login](21_page_login.md).

## UI components and layout

The heading is Profile. The account card shows, in this order:

- Name
- Email
- How you work, using the onboarding labels: Travels to the client, Clinic, or Both
- Vehicle costs, using the onboarding labels: Single-rate mileage or Vehicle costs as actually paid

The form below uses `AddressFields`: address line 1, address line 2, town, and postcode. The button reads Save address, and Saving… while the request is in flight.

## Input fields and field types

The four address fields are text. Line 1 and line 2 accept up to 100 characters. Town accepts up to 80. Postcode accepts up to 8 characters in the field. The server stores a UK postcode in uppercase with one space.

Name, email, practice type, and vehicle method are not inputs.

## Validation rules

Save is refused in the browser when line 1, town, or postcode is blank after trimming. The message is `Enter the address.` Line 2 may be blank.

A postcode that is not a UK postcode is `400` `Enter a UK postcode`. A blank line or town that reaches the server is `400` `Address is required`. Show that message with `FormError` and keep the typed fields.

## Business logic and calculations

This page does not calculate tax or rewrite an invoice. `PATCH /users/me/address` replaces the user's address. The next invoice copies the new address. An invoice that was already issued keeps its copy.

## Data models and API dependencies

```ts
interface PostalAddress {
  addressLine1: string;
  addressLine2?: string;
  town: string;
  postcode: string;
}
```

`PATCH /users/me/address` with the bearer token. Success `200` is a `User`. The four address fields are present after a save. `addressLine2` is omitted when the second line is blank. The response has no password.

The page reads the session `ReadyUser` and writes the returned user back through `asReadyUser`.

## Loading, empty, success, and error states

- Opening the app with a token shows `Checking your session…` until `GET /users/me` returns. This page itself does not show a second loading line.
- The form starts from the stored address. A user with no address yet sees empty fields.
- Success shows `Address saved.` Editing a field hides that line.
- Failure shows `FormError`, hides the success line, and leaves the typed address in the form.
- The button is disabled only while the request is in flight.

## Security and data-access considerations

The route requires the bearer token and a completed onboarding. The body has no user id. The server updates the token user. A `401` returns to login. This page does not change another user's address.

## Acceptance criteria and test scenarios

- After onboarding, Profile is in the menu and `/profile` shows the signed-in name and email.
- Practice type and vehicle method use the same labels as onboarding. Those four account lines are not inputs.
- Changing line 1, town, or postcode, then saving, returns `200`. Invoices then shows the new business address, with a link back to this page.
- Clearing address line 2 and saving omits `addressLine2` from the request. The form and the invoice line no longer show that second line.
- A postcode such as `NOT A CODE` shows `Enter a UK postcode` and does not replace the stored address.
- An invoice issued before the correction still shows the old address on its PDF.
- Before onboarding, Profile is not in the menu.

## Dependencies on other pages or shared components

Depends on [`26_page_onboarding.md`](26_page_onboarding.md) for the first address and the labels, on [`25_page_invoice.md`](25_page_invoice.md) for the address shown when issuing a bill, and on the menu in `App.tsx`. Shared pieces are `address-fields.tsx`, `address.ts`, `api.ts`, `format.ts`, `FormError.tsx`, and `asReadyUser` in `types.ts`.
