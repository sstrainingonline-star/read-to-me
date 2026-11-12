# Read To Me Version 4 — GitHub + Appwrite project

A mobile-first reading-support PWA for iPhone and Android. OCR and speech run in the student's browser/device. The app is designed to read supplied text aloud only; it does not answer, explain or summarise assessment questions.

## Important: what is ready, and what still needs connecting

- The student interface, camera capture, image upload, browser OCR, voice selection, voice preview, speed control and speech controls are included.
- The app uses voices exposed by the phone/browser through the Web Speech API. It cannot install voices or guarantee the same voices on every phone.
- OCR uses Tesseract.js from a CDN. The first OCR use needs an internet connection to load the OCR engine and English language data.
- GitHub Pages hosts the static app only. It is **not** a secure authentication server.
- `config.js` is a placeholder until you create an Appwrite project and deploy the Function.
- The included Function is a security starter, not a finished production identity system. Student login currently validates hashed codes server-side, but it returns a temporary session token that is **not yet verified on subsequent actions**. Admin operations intentionally remain disabled. Do not use this package for live student accounts or formal assessments until the production security TODOs below have been completed and tested.

## 1. Upload to GitHub

1. Download and unzip this project.
2. Create a new GitHub repository, for example `read-to-me-v4`.
3. Upload the contents of this folder to the repository root (not the enclosing folder).
4. Open **Settings → Pages**.
5. Under Build and deployment, select **Deploy from a branch**, choose `main` and `/ (root)`, then Save.
6. Wait for GitHub Pages to publish the site. Open the Pages URL on a phone.
7. Camera access requires HTTPS; the GitHub Pages URL provides HTTPS.

## 2. Appwrite project setup

Create an Appwrite Cloud project. Create a database and two collections.

### `students` collection

Create these attributes:

| Attribute | Type | Notes |
|---|---|---|
| `studentId` | string, required, unique | Non-sensitive academy username |
| `displayName` | string, required | Student display name |
| `active` | boolean, required | Default true |
| `role` | string, required | `student` or `admin` |
| `permanentCodeHash` | string | SHA-256 hash only; never plaintext |
| `temporaryCodeHash` | string | SHA-256 hash only |
| `temporaryCodeExpiresAt` | datetime | Expiry |
| `temporaryCodeUsed` | boolean | Default false |

Create an index on `studentId` (unique).

### `events` collection

| Attribute | Type | Notes |
|---|---|---|
| `studentId` | string, required | Academy username |
| `eventType` | string, required | e.g. login, page_hidden, page_visible |
| `at` | datetime, required | Event timestamp |
| `detail` | string | Optional event detail |

Set collection permissions so clients have **no direct read/write access**. Only the server Function's API key should access these collections.

### Function deployment

1. Create an Appwrite Function using Node.js 20 or a currently supported Node runtime.
2. Upload the contents of `functions/access-api` as the function source.
3. Install dependencies from `package.json` during build.
4. Add environment variables:
   - `APPWRITE_API_KEY` — server-side API key with only the required database permissions
   - `DATABASE_ID`
   - `STUDENTS_COLLECTION_ID`
   - `EVENTS_COLLECTION_ID`
5. Set the function execute access to the minimum needed for the public login endpoint. The function itself must validate every action.
6. Copy the Function ID into `config.js`.

## 3. Configure the front end

Edit `config.js`:

- `endpoint`: your Appwrite endpoint
- `projectId`: your Appwrite project ID
- `databaseId`: your database ID
- `functionId`: your Function ID
- Set `enabled: true` only after the function is deployed and tested.

Never paste an Appwrite API key, admin password, student code list or other secret into `config.js` or any GitHub file.

## 4. Production security work required before use

The supplied Function deliberately disables admin actions. Before live use, a developer must implement and test all of the following:

1. Rate limiting and progressive lockout for failed student-code attempts (server-side, keyed by account and source).
2. Secure session issuance: store only a hash of each session token, bind it to a student and expiry, verify it on every protected request, and revoke it on logout/expiry.
3. Admin authentication using Appwrite Auth with MFA where available. Verify the authenticated Appwrite user and an admin role on the server for every admin action. Never trust a role, student ID or token supplied by the browser.
4. Admin actions: create/deactivate students, reset permanent code, issue/revoke one-time assessment codes, set expiry, and view session events. Generate random codes on the server and store only hashes.
5. Atomic one-time code redemption so two simultaneous requests cannot both use the same assessment code.
6. Audit records for admin changes, access attempts, code issuance/revocation and session events.
7. Validate input lengths/types and use strict CORS allow-lists for your GitHub Pages origin.
8. Add automated security tests and have the academy's data protection lead approve the design and retention period.

Do not deploy a public admin PIN in JavaScript. Do not reuse a PIN or password from another system.

## 5. Device and assessment notes

- Students use their own phones. The browser asks permission when camera use is requested.
- Students can choose among voices exposed by their phone/browser. For additional voices, they may need to install an enhanced voice in phone settings. iPhone and Android menus vary by operating-system version.
- The app cannot force the student to stay in the app, prevent notifications, prevent screenshots, or reliably detect every app switch. `page_hidden` and `page_visible` are only browser visibility events; they can occur because of calls, notifications, switching apps, locking the screen or browser suspension. They are not proof of misconduct.
- For stronger focus during an assessment, the centre may ask students to use iPhone Guided Access or Android screen pinning. These are device settings and cannot be enforced by this website.
- OCR can misread text. Always check the recognised text against the printed question before listening.
- Before any formal assessment, confirm with the awarding organisation and centre that this reader and the chosen device arrangement are permitted. The app is not a certified access-arrangement approval.

## Privacy by design

The intended design keeps photographed assessment material and OCR text in the browser. Do not add image/text uploads to a server. The backend should store only the minimum account, access-code hash, audit and session-event information needed. Set a documented retention period, restrict staff access, and obtain the academy's data protection approval before real learner data is entered.

## Local preview

You can preview the static interface by opening `index.html`, but camera and PWA features work best when served over HTTPS or localhost. Login will not work until Appwrite is configured.
