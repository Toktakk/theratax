# Login page

Index: [Page plans](20_plan_pages.md). The build check for this screen is [step 12](14_step12_react_pages.md). The HTTP shape is [step 6](08_step06_register_login_onboarding.md).

## Purpose and scope

`client/src/pages/SignInPage.tsx` is `/`. It is the door in front of the product. It is not an item in [`01_user_flow.md`](01_user_flow.md).

The page collects email and password, calls `POST /auth/login`, and stores the token. It does not collect a name. It does not onboard the user. It does not offer a second form for registration.

## User flows and navigation

With no token, `/` is this page. Any other path redirects to `/`.

A link goes to `/register`. After `200`, store `accessToken`, then the app calls `GET /users/me`. If `onboardedAt` is `null`, show only [onboarding](26_page_onboarding.md). If it has a value, open the [feed](23_page_feed.md).

Refresh reads the token back and calls `GET /users/me` again. The user stays signed in.

Log out clears the token, returns to this page, and must not call `GET /users/me`. A later `401` with a stored token does the same: delete the token and show this form.

## UI components and layout

The page is the auth layout: the TheraTax title, a short line, and one card. The card has the heading Log in, the two fields, `FormError`, the submit button, and the link Create an account.

The button label is `Log in`. While the request is in flight it reads `Logging in…` and is disabled.

## Input fields and field types

| On screen | Control | Sent as |
| --- | --- | --- |
| Email | `type="email"` | `email`, trimmed |
| Password | `type="password"` | `password`, not trimmed |

There is no name field and no remember-me field.

## Validation rules

The email must be an email. The password is the string the user typed. This page does not invent a minimum length of its own. A password the server rejects comes back as `401`.

A mismatch of email or password is `401` and the message is `Invalid email or password`. Do not say which part was wrong.

`message` may be a string or an array. Show a string as it is. Join an array into text a person can read.

## Business logic and calculations

This page does not calculate money. The token is an opaque string. The client does not decode it.

## Data models and API dependencies

`POST /auth/login` with `{ email, password }` and no `Authorization` header. Success is `200`:

```ts
interface AuthResponse {
  accessToken: string;
  user: User;
}
```

`User` includes `id`, `email`, `name`, `practiceType`, `expenseMethod`, and `onboardedAt`. `onboardedAt` is always present. It is `null` until onboarding. The response has no password and no `passwordHash`.

`client/src/api.ts` writes `accessToken` to `localStorage` before `GET /users/me`.

## Loading, empty, success, and error states

- Waiting for a stored token on app open shows `Checking your session…`. That state is in `App.tsx`, not in the form.
- The form starts empty, with no error.
- Submit clears the previous error, disables the button, and shows `Logging in…`.
- Success leaves this page. The form is not left on screen with a success banner.
- Failure leaves the fields in place and shows the message. The button is enabled again.

## Security and data-access considerations

Login is callable with no token. Do not send `Authorization` on this request. Do not put the password in `localStorage` or in the user object. The only secret kept in the browser is `accessToken`.

A failed login uses one message for an unknown email and a wrong password.

## Acceptance criteria and test scenarios

- Register is a separate route. Both forms are not on this page.
- A wrong password shows `Invalid email or password` and stays on this page.
- A successful login stores the token. Refresh is still signed in because `GET /users/me` returns `200`.
- A new user with `onboardedAt: null` cannot open the feed.
- A user who already onboarded lands on the feed.
- Log out returns to this form. The next request is not `GET /users/me` without a token.
- The Network tab shows `POST /auth/login` and then `GET /users/me`. It does not show a transaction or a tax summary from this page.

## Dependencies on other pages or shared components

Depends on [`22_page_register.md`](22_page_register.md) for the link, on [`26_page_onboarding.md`](26_page_onboarding.md) and [`23_page_feed.md`](23_page_feed.md) for where success goes, and on `api.ts`, `FormError.tsx`, and the session in `App.tsx`.
