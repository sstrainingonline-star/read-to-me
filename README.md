# RTM — Read To Me | Learning Support

A fresh, static web app. No Appwrite, accounts, build tools or npm dependencies.

## Install on GitHub Pages
1. Keep a backup of your old repository before replacing files.
2. Open `setup.html` in Chrome or Safari (or publish it temporarily on GitHub Pages if local browser crypto is unavailable).
3. Enter a **new** administrator password (12+ characters) and select **Generate configuration**.
4. Copy the resulting text and replace all content in `config.js` with it.
5. Upload `index.html` and the completed `config.js` to the root of your GitHub Pages repository. Do **not** publish `setup.html` if you don't need it.
6. In GitHub Pages settings, publish from the main branch/root. Open the HTTPS site and refresh.
7. Sign in as administrator, generate a student code, and test it on a separate phone. Codes expire two hours after creation.

## What works
- Administrator password sign-in on the configured website.
- Two-hour codes usable on different devices, with no Appwrite.
- Type/paste text and read it aloud using the browser/device speech voices.
- Select available voices and reading speed.
- Take a photo with the mobile camera or upload a picture, extract printed English text and read it aloud.
- Student page reload, page hiding or navigation ends the active session; expired codes are rejected.

## Important limitations
- This is **not** secure examination software. The signing key and password hash live in public browser-delivered JavaScript; technically capable users can inspect them and forge codes. Use server-side authentication before real assessed examinations.
- Student codes remain valid for two hours and can be entered again after a student exits. Without a backend there is no reliable way to revoke or mark a code as used across devices.
- iOS/Android do not permit websites to reliably detect or block every app switch, screenshot, split-screen, or another device. The page uses `visibilitychange` to end the current student session when the browser hides, but this is best-effort only.
- Image OCR uses Tesseract.js downloaded from a CDN; **internet is required** to load it. Text recognition is then performed in-browser, not sent to an RTM server. The device's built-in speech engine is used for reading, but OCR is not the native phone camera's text-recognition service.
- Browser voice lists vary. Speech is initiated by a button press. Camera capture opens the phone's camera via its standard file input, subject to browser permission prompts.
- There is no voice-to-text dictation feature; the requested feature is text-to-speech.

## Files
- `index.html`: complete responsive application.
- `config.js`: credentials/configuration; MUST be completed before use.
- `setup.html`: one-time configuration generator, not required after setup.

## Suggested next version
Appwrite or another backend for proper admin login, individual student accounts, one-time code use, server-side expiry/revocation and audit logs.
