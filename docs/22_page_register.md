# Registration page

Index: [Page plans](20_plan_pages.md). The build check for this screen is [step 12](14_step12_react_pages.md). The HTTP shape is [step 6](08_step06_register_login_onboarding.md).

## Purpose and scope

`client/src/pages/RegisterPage.tsx` is `/register`. It creates one user and signs that user in. It does not choose a practice type or a vehicle method. Those stay on [onboarding](26_page_onboarding.md).

Login and register are two routes. Do not put both forms on one page.

## User flows and navigation

The login page links here. This page links back to `/` with Already have an account? Log in.

Submit calls `POST /auth/register`. On `201`, store `accessToken` and call `GET /users/me`, the same path as login. A new user has `onboardedAt: null`, so the next screen is onboarding, not the feed.

Refresh after success stays signed in. There is no separate "check your email" screen. The API does not send a verification message.

## UI components and layout

The auth layout matches login: title, short line, and one card. The card heading is Register. The fields are name, email, and password, then `FormError`, the submit button, and the link back to login.

The button label is `Create account`. While the request is in flight it reads `Creating account…` and is disabled.

## Input fields and field types

| On screen | Control | Sent as |
| --- | --- | --- |
| Name | text | `name`, trimmed, 1–200 characters |
| Email | `type="email"` | `email`, trimmed |
| Password | `type="password"` | `password`, 8–72 characters, not trimmed |

Field order on the screen is name, email, password.

## Validation rules

The email must be an email. The name is 1 to 200 characters after trim. The password is 8 to 72 characters. Character 73 is rejected by the DTO so bcrypt cannot silently drop the tail.

A duplicate email is `409` and the message is `Email already registered`.

A password shorter than 8 characters is `400`. `message` is an array. Show that array as text. Do not replace it with a different sentence.

There is no confirm-password field. The API does not have one.

## Business logic and calculations

This page does not calculate money. Register and login return the same `AuthResponse`. Nest returns `201` for this `POST` without an extra status decorator.

The stored password is a hash. The response has no password field.

## Data models and API dependencies

`POST /auth/register` with `{ email, password, name }` and no bearer token.

Success:

```ts
interface AuthResponse {
  accessToken: string;
  user: User;
}
```

`User.onboardedAt` is `null`. `practiceType` and `expenseMethod` are `null`.

`client/src/api.ts` stores `accessToken` and then loads `GET /users/me`.

## Loading, empty, success, and error states

- The form starts empty.
- Submit clears the previous error and disables the button.
- Success leaves this page for onboarding.
- Failure keeps the typed values and shows the message. The button is enabled again.
- There is no empty-list state. This page has no list.

## Security and data-access considerations

Register is callable with no token. Do not send a bearer header. Do not store the password. A duplicate email is a conflict, not a hint that reveals a different user's data beyond the fixed message `Email already registered`.

## Acceptance criteria and test scenarios

- The Network tab shows `POST /auth/register` with `201`, then `GET /users/me`.
- The user lands on onboarding, not the feed.
- Refresh stays signed in.
- The same email again shows `Email already registered` and does not replace the first account.
- A password shorter than 8 characters shows the pipe's array.
- Log out returns to login. This page is not shown as a second form on that screen.
- No transaction, invoice, or tax request runs from this page.

## Dependencies on other pages or shared components

Depends on [`21_page_login.md`](21_page_login.md) for the return link, on [`26_page_onboarding.md`](26_page_onboarding.md) for the next screen, and on `api.ts`, `FormError.tsx`, and the session in `App.tsx`.
