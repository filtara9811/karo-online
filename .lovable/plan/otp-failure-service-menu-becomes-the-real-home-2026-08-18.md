# OTP failure + service menu becomes the real home

## 1. OTP not arriving (screenshot 1)

What is confirmed from the data:
- An SMS gateway IS active and live (Fast2SMS, test mode OFF).
- OTP delivery logs show successful sends today, the latest only minutes before your screenshot — so the gateway itself is working.
- No error entry was written for your failed attempt, and the message you saw is the app's generic "OTP service temporary issue hai" text. That generic text hides the real reason, so the cause is currently **unconfirmed**.

Because of that, step 1 is diagnosis, not a guess:

1. Stop masking the real error. The mobile step will show the actual reason returned by the server (gateway/config/network/cooldown), so the failure is visible instead of a vague sentence.
2. Always record the failure. Every failed send writes an entry (kind `otp`) with the exact cause; if writing that entry itself fails, the reason is also returned to the app so it appears on screen.
3. Add resilience for the two realistic causes: a one-time automatic retry when reading the gateway list fails transiently, and a clear "OTP already sent — wait Ns" state instead of an error when the 60-second per-number cooldown is active (right now a cooldown can look like a failure).
4. Add a visible "Send again" action with the live countdown on the mobile step.
5. Verify by triggering a real send to your number after the change and reading the recorded log entry, then confirm the exact cause and fix it in the same turn if it turns out to be config (sender ID / template / API key).

## 2. Menu on every login, and the chosen service becomes the home screen

Current behaviour: after OTP you get the Service Selection Menu, tapping a tile navigates to that service, but the app's home (`/`) is always the Quick Service screen (screenshot 5). So One QR does not "stay" as home.

New behaviour:

- After OTP (new signup and re-login) → Service Selection Menu with only admin-enabled services. Unchanged, kept as-is.
- Tapping a tile saves that choice as the user's **active workspace** and routes to its dashboard:
  - Digital QR Code → One QR dashboard (screenshot 4)
  - Quick Service → Quick home (screenshot 5)
  - Digital Shop → shop discovery
  - Vendor Panel → vendor dashboard (or Join if no vendor profile yet)
- The saved workspace becomes the home screen: opening the app, or hitting `/`, renders the chosen service's dashboard — so a QR user never sees the Quick home again, and a Quick user does.
- If the saved service gets toggled OFF by admin later, the saved choice is dropped and the menu shows again.
- A "Switch service" entry (in the Quick Menu / profile sheet) reopens the Service Selection Menu so a user can change workspace without logging out.

## Technical notes

- Active workspace stored in `localStorage` (`ko_active_service`, holding the service id) and validated against `useServiceMenu()` enabled list on read; invalid/disabled id → clear and show the menu.
- New helper in `src/lib/service-menu.ts`: `readActiveService()` / `writeActiveService()` / `clearActiveService()`.
- `src/routes/index.tsx` currently renders `QuickPage` directly. It becomes a small dispatcher: on mount, resolve the stored service; `quick` → render `QuickPage` as today (no redirect, keeps SEO metadata and SSR content), any other service → client-side `navigate({ to: route, replace: true })`. Route metadata in `head()` stays unchanged.
- `src/components/AuthGate.tsx` and `src/routes/register.tsx`: in `onPick`, write the chosen service before navigating.
- `ProfileHubSheet.tsx`: add "Switch service" which clears the stored service and opens `ServiceMenuScreen`.
- OTP work is confined to `src/lib/otp.functions.ts` (error propagation, gateway-read retry, guaranteed logging) and the step-1 UI in `src/components/RegistrationFlow.tsx` (real error text, resend button + countdown).
- No schema changes needed.
