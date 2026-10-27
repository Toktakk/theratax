# Onboarding page

Index: [Page plans](20_plan_pages.md). This is item 1 in [`01_user_flow.md`](01_user_flow.md). The build check is [step 12](14_step12_react_pages.md). The HTTP shape is [step 6](08_step06_register_login_onboarding.md).

## Purpose and scope

`client/src/pages/OnboardingPage.tsx` runs once, after register or login, while `onboardedAt` is `null`. It records how the therapist works, how vehicle costs are claimed, and the first business address. That address can be corrected later on the [profile page](28_page_profile.md).

It has no URL of its own. While it is showing, the feed, invoices, and the tax summary are not reachable. It does not log income, create a workplace, or change the method later.

## User flows and navigation

App open with a token calls `GET /users/me`. A null `onboardedAt` shows this page and nothing else. Submit saves the business address with `PATCH /users/me/address`, then calls `PATCH /users/me/onboarding` once. On success `onboardedAt` is an ISO 8601 string, and the app opens the [feed](23_page_feed.md). A later correction of that address is the [profile page](28_page_profile.md).

Refresh after success stays on the feed. A user who already onboarded must not see this form again.

Log out is on this page and returns to [login](21_page_login.md).

A second PATCH, including one made from developer tools, gets `409` `Onboarding already completed`. Show that message. Do not send the user through the form again as if the first save had failed.

## UI components and layout

The header shows TheraTax, the user's name, and Log out. The form asks two questions, then the business address. That address is corrected later on the [profile page](28_page_profile.md).

Practice:

| On screen | Value sent |
| --- | --- |
| Travels to the client | `practiceType: mobile` |
| Clinic | `practiceType: fixedLocation` |
| Both | `practiceType: mixed` |

Vehicle method, with the note that this method applies to the car only. Massage oils, HCPC fees, insurance, and laundry are still typed as amounts.

| On screen | Value sent |
| --- | --- |
| Single-rate mileage | `expenseMethod: flat_rate` |
| Vehicle costs as actually paid | `expenseMethod: actual_cost` |

Submit stays disabled until both choices are set. While the request is in flight the button stays disabled.

## Input fields and field types

Both fields are radio groups. The sent values are the strings in the tables above. Do not send labels.

## Validation rules

The client does not submit until both radios have a value. The DTO still requires both. An unknown value is `400` and `message` is an array.

A second save is `409` `Onboarding already completed`. The server uses an update that matches `onboardedAt: null`, so two requests at once cannot both succeed.

`practiceType` does not change which categories the server accepts. A therapist in a clinic can still log mileage. `expenseMethod` filters categories on the feed only.

## Business logic and calculations

This page does not calculate tax or mileage. Flat rate cannot be changed later, because the API returns `409`. Actual cost is the same: one save.

The user is a sole trader. There is no legal-form field.

## Data models and API dependencies

```ts
interface OnboardingRequest {
  practiceType: 'mobile' | 'fixedLocation' | 'mixed';
  expenseMethod: 'flat_rate' | 'actual_cost';
}
```

`PATCH /users/me/onboarding` with the bearer token. Success `200` is a `User` with both fields set and `onboardedAt` set. The response has no password.

## Loading, empty, success, and error states

- Opening the app with a token shows `Checking your session…` until `GET /users/me` returns.
- The form starts with neither radio selected. There is no default method.
- Success replaces this page with the feed. The feed may be empty.
- Failure shows `FormError` and keeps the selected radios. The button is enabled again when the choices are still set.
- `409` shows `Onboarding already completed`.

## Security and data-access considerations

The route requires the bearer token from login or register. A missing token is `401` `Unauthorized` and returns the user to login. This page does not onboard a different user. The body has no user id. The server uses the token.

## Acceptance criteria and test scenarios

- A new account is stuck on this page. The feed is not in the menu.
- Travels to the client and single-rate mileage succeed. An empty feed appears.
- Refresh stays on the feed. This form does not return.
- A second PATCH shows `Onboarding already completed`.
- The labels map to the values in the tables. The Network tab body is those values, not the sentences.
- Log out from this page returns to login.

## Dependencies on other pages or shared components

Depends on [`21_page_login.md`](21_page_login.md) and [`22_page_register.md`](22_page_register.md) for the token, on [`23_page_feed.md`](23_page_feed.md) for the next screen, on [`28_page_profile.md`](28_page_profile.md) for a later address correction, and on `api.ts`, `FormError.tsx`, and `asReadyUser` in `types.ts`. The feed's category filter reads `expenseMethod` from the user this page saved.
