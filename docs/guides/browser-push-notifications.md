# Browser push notifications

In-app bell delivery always ships with `sendNotification` / `sendUserNotification`. Browser (web) push is optional: the user must grant notification permission and register an FCM token (Account → **Notifications**, or the post-login soft-ask).

## Account settings

Account → Settings → **Notifications** owns:

- Browser push toggle for this device
- **Test in-app** / **Test push** buttons (`POST /api/notifications/test` with `channel: "inApp" | "push"`)
  - `inApp` — persists a notification for the current user only (no FCM)
  - `push` — FCM multicast to registered tokens with a **`notification` payload** so Chrome shows an OS toast even while the settings tab is focused (no in-app row). Returns `400` / `no_push_token` when none are registered, or `502` with the FCM error when every token fails.

### Troubleshoot: `cloudmessaging.messages.create` denied

The API Cloud Run runtime SA (`es-backend-sa-{dev|stg|prod}`) needs **Firebase Cloud Messaging API Admin** (`roles/firebasecloudmessaging.admin`) on the GCP project. Terraform grants this in [`iam.tf`](../../packages/infrastructure/terraform/iam.tf) (and the worker SA in `cloudtasks-ai-jobs.tf`).

**Immediate grant (dev example):**

```bash
gcloud projects add-iam-policy-binding entitysystem-development \
  --member="serviceAccount:es-backend-sa-dev@entitysystem-development.iam.gserviceaccount.com" \
  --role="roles/firebasecloudmessaging.admin"

gcloud projects add-iam-policy-binding entitysystem-development \
  --member="serviceAccount:es-worker-svc-sa-dev@entitysystem-development.iam.gserviceaccount.com" \
  --role="roles/firebasecloudmessaging.admin"
```

IAM is usually effective within a minute; no API redeploy required. Then retry **Test push**.

## Architecture (short)

| Layer | Role |
| --- | --- |
| Web SW (`apps/web/app/sw.ts`) | `onBackgroundMessage` → OS notification from `data.title` / `data.body` |
| Web client (`firebase-messaging.ts`) | Token register/clear; foreground `onMessage` → Sonner toast |
| API `__push_tokens` | Per-user FCM token CRUD (`/api/push-tokens`) |
| `createDeliverWebPushNotification` | Best-effort FCM multicast (**data-only** payload) |

Local Docker typically **cannot deliver** FCM: the web app can register tokens with real `VITE_FIREBASE_*` + VAPID, but API/worker often use the Auth/Firestore emulator Admin app without a real service account. There is no FCM emulator. Verify send on a **deployed** environment.

## Deploy QA runbook (`entitysystem-development` / `dev`)

### Preconditions

1. GitHub environment secrets include `FIREBASE_VAPID_KEY` and the Firebase Admin service account used by API/worker.
2. Deploy workflow maps `FIREBASE_VAPID_KEY` → `VITE_FIREBASE_VAPID_KEY` for the web build (see [environment-variables.md](../infrastructure/environment-variables.md)).
3. Web Push certificate exists in Firebase Console → Project settings → Cloud Messaging.

### Steps

1. Deploy web + api + worker to the target environment.
2. Open the app in Chrome desktop, sign in → after ~2s a soft-ask toast (“Stay up to date”) should appear → click **Enable** → grant the OS permission prompt.
3. Confirm `PUT /api/push-tokens` succeeds (Network tab) or that Firestore has a document under `__push_tokens` for the user.
4. Trigger a hook / path that calls `sendUserNotification` (any Data Hook `sendNotification` action is fine).
5. **Tab focused:** an in-app Sonner toast appears; **no** duplicate OS toast; the notification bell unread count updates promptly. (Poll-driven toasts are suppressed for ~15s after a foreground FCM toast so the same notification is not shown twice.)
6. **Tab blurred / backgrounded:** an OS notification appears; clicking it focuses the app and navigates toward `/notifications`.
7. Account → Notifications → turn browser notifications **off** → token is removed; further sends do not reach this device.
8. (Fresh profile / cleared site data) Deny the OS prompt: UI stays stable; soft-ask does not reappear; Account → Notifications toggle shows the denied state.
9. Account → Notifications → **Test in-app** (bell updates) and **Test push** (focused/blurred toast) when a token is registered.

### Soft-ask nag rules

| Action | Effect |
| --- | --- |
| Enable | Native permission + token register |
| Not now | Snooze 7 days |
| Dismiss / auto-close | Snooze 1 day |
| 3 snoozes | Stop asking (`localStorage` `push-optin:<uid>` = `never`); Account → General still works |

### Rollback

Revert the change that switched FCM to data-only and/or the soft-ask / `onMessage` client code. Restoring the `notification` field on multicast re-enables Chrome’s automatic OS toast (including focused tabs). The SW still accepts either `notification` or `data` title/body.

## Related

- [hooks-system-guide.md](./hooks-system.md) — `sendNotification` action
- [data-hook-definition-json.md](../reference/data-hook-definition.md) — action schema
- [infrastructure/environment-variables.md](../infrastructure/environment-variables.md) — `VITE_FIREBASE_VAPID_KEY` / `FIREBASE_VAPID_KEY`
- [infrastructure/bootstrap-new-gcp-account.md](../infrastructure/bootstrap-new-gcp-account.md) — Web Push certificate setup
