# Read To Me — Reading Assistant

A free, mobile-first reading support website/PWA for students. It recognises printed English text with Tesseract.js and reads it aloud using the device/browser speech engine. It does not generate answers or explanations.

## Files
- `index.html` — app layout
- `styles.css` — responsive dark interface
- `app.js` — camera, OCR and speech controls
- `manifest.webmanifest` and `icon.svg` — installable app metadata
- `service-worker.js` — caches the app shell

## Publish on GitHub Pages
1. Create a new GitHub repository, for example `read-to-me`.
2. Upload **all files in this folder** to the repository root (not the ZIP itself).
3. In the repository, open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Open the HTTPS GitHub Pages address on the student's phone.
6. On iPhone, open the site in Safari, tap Share → Add to Home Screen. On Android, use the browser's Install/Add to Home Screen option.

## Important
- Camera access requires HTTPS (GitHub Pages provides this) or localhost.
- The first OCR engine/language download needs an internet connection. The app shell is cached, but the OCR engine and English language data are loaded from the Tesseract.js CDN. This project does not need an API key or paid AI service.
- OCR is not perfect. Clear print, good light, a steady camera and a page held flat help.
- Speech voices vary by device. The app uses the phone/browser's built-in speech voices where available.
- Camera frames are processed in the browser. No image upload service or account is configured.
- This is a learning support prototype, not a certified exam access-arrangement product. Confirm permission with the relevant awarding organisation/centre before using it in a formal assessment.
- For the most reliable experience, test on the actual student devices and browsers before distributing it.

## Current behaviour
- Live camera scanning checks the image periodically.
- Auto-read waits for text to be stable across two scans and then reads it.
- Read this page captures and reads the current camera frame.
- Upload a photo supports an existing image or taking a photo from a compatible phone.
- Speed, voice and text size can be adjusted.
