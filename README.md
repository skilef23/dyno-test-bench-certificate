# KRA Dyno Test & Quality Certificate System

Development web application for dyno test records, automatic PASS/FAIL evaluation, supervisor approval, performance charts, and product quality certificate PDF generation.

## Data architecture

- Cloud Firestore is the shared multi-computer data source.
- Firebase Anonymous Authentication protects the development Firestore workspace from unauthenticated access.
- Browser local storage remains an immediate cache and offline fallback.
- Full JSON download and restore provide an independent recovery copy.

## Firebase setup before publishing

1. Open the Firebase project referenced by `firebase-applet-config.json`.
2. Create a Cloud Firestore database in Native mode.
3. In Authentication > Sign-in method, enable Anonymous authentication.
4. Publish the rules from `firestore.rules` using Firebase CLI or the Firebase Console.
5. Add the published application domain to Authentication > Settings > Authorized domains.
6. Run `npm run lint` and `npm run build` before deployment.

The included rules are intentionally limited to the `kra-development` workspace but still allow every authenticated anonymous session to read and write development data. Do not use these rules for production.

## Local development

```bash
npm install
npm run dev
```

## Production readiness still required

- Replace anonymous authentication and local application passwords with managed employee authentication.
- Enforce ADMIN, QC_TESTER, and SUPERVISOR authorization in Firestore rules or trusted backend code.
- Remove demonstration credentials and sample identities.
- Configure monitoring, retention, and a formal backup policy.
