# Read To Me — Clean V4.4 (browser demo)

This is a cleaned, deployable static website for GitHub Pages. It is **not** a production student-account or exam-security system.

## Install
1. Extract the ZIP.
2. Upload **the files inside `read-to-me-main`** to the root of your GitHub Pages repository, replacing older versions.
3. In GitHub Settings > Pages, publish from `main` / `(root)`.
4. Visit the published HTTPS website, not the repository file preview. Reload after deployment.
5. Internet is needed for the OCR engine. Allow camera permission when prompted.

## Demo access
- Reader: `DEMO2026`
- Admin preview: `ADMINDEMO2026`

These codes are visible in public source. Do not use them to protect learner data or assessments. Learner codes generated in the admin preview are stored only in that browser, **not shared across devices**.

## What was cleaned
- Removed the disconnected, unfinished Appwrite Function starter; it was not used by the website and included unfinished authentication work.
- Updated asset cache versions to 4.4.
- Guarded local voice preference storage where browser storage is blocked.
- Prevented stale OCR results from being written after logout.
- Stop the live camera after taking a picture.
- Guarded against a late camera permission response after logout.

## Reader features
Camera preview and capture, upload photo, phone camera file picker, English OCR, read aloud, pause/resume, stop/repeat, browser voice selection, voice test, speed and font size. OCR runs in the browser via Tesseract.js downloaded from a CDN. Phone browsers may require pressing **Read aloud** to start speech.

## Important limitations
This is a functioning **demonstration**, not a secure multi-device application. To issue genuinely one-time codes across devices, add a secure backend with atomic code redemption, authenticated admin accounts, session verification, audit logging and appropriate privacy controls. No phone website can reliably prevent app switching or guarantee assessment integrity. Obtain awarding-body approval before formal exam use.

## Verification
JavaScript syntax and package structure can be checked automatically; camera, OCR accuracy, speech and GitHub Pages deployment must also be tested on the target devices.
