# KRA Dyno Test & Quality Certificate System

React/Vite application for test records, parameter evaluation, supervisor review, performance graphs and A4 test reports/certificates.

## Current implementation

This revision addresses test validation, actual DynPro imports, approval locks and certificate wording. It does **not** implement production authentication, shared cloud persistence or full backup restoration.

- Data currently lives in React state and browser localStorage. The included Firebase configuration and development rules do not constitute a working cloud integration.
- Local storage retains only a limited audit history and strips large uploaded file content. Preserve an independent backup before any deployment; full evidence retention needs the separate storage phase.
- Authentication is still the existing development implementation. Client-side role checks are not a trusted authorization boundary.
- Backup JSON export remains available. Restore is unavailable in the existing context and now reports that limitation before touching active data.
- New engine submissions require an original imported DynPro source, valid JIS factor and explicit performance confirmation. Legacy sources without provenance must be re-imported for new submissions.
- Approved legacy records remain unchanged in storage. Certificates with missing verification evidence or inconsistent results are displayed as reports requiring review, not official release certificates.

## Local development and verification

Use Node.js 22.13+ (tested with Node 24) and npm:

```bash
npm ci
npm run lint
npm test
npm run build
npm run dev
```

`npm run lint` runs TypeScript, including React declarations. `npm test` exercises evaluation, invalid imports, provenance, JIS calculations, workflow eligibility and certificate HTML rendering. It does not replace testing with actual DynPro reports and the deployed application's browser environment.

The original `bun.lock` is retained for historical compatibility; the new `package-lock.json` is authoritative for the tested npm installation.

## DynPro imports

PDF extraction requires a text-based PDF. Scanned PDFs are rejected. The PDF worker is bundled locally with Vite instead of loaded from an external CDN.

Recognized numeric row layouts are:

```text
RPM Power Torque
1200 500 300
1500 600 280
1900 700 260
```

or:

```text
LineNumber RPM Power Torque
4 1200 500 300
5 1500 600 280
6 1900 700 260
```

Comma, semicolon, tab or space delimiters and decimal-point numeric values are supported. At least three distinct valid LOAD RPMs are required. Unsupported numeric rows reject the import; the parser does not guess additional column layouts or create fallback measurements. Additional actual report formats require explicit column mapping and fixture testing.

Existing LOAD classification and nearest-rated-RPM selection are retained; per-product maximum rated RPM deviation and engineering validation remain follow-up work. The JIS factor is entered by QC, not calculated from ambient measurements.

## Demonstration data

Production builds hide sample/preset actions. For local development only, `VITE_ENABLE_DEMO=true` enables them; any record using demo data is marked and blocked from submission and certification. Initial sample records are retained without migration or deletion.

## Production work still required

Managed employee authentication, trusted authorization rules/backend validation, Firestore synchronization, original-file object storage, atomic multi-user numbering, safe migration, durable audit history and full backup/restore need separate implementation and deployment verification. Do not treat this phase as production certification of the application.
