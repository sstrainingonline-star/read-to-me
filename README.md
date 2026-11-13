# RTM — Read To Me / Learning Support (fresh rebuild)

## Install on GitHub Pages

1. Create an empty repository or remove the previous app files from the existing repository.
2. Upload **index.html** to the root of the repository.
3. In Settings → Pages, choose Deploy from branch, main, / (root).
4. Open the HTTPS Pages URL on desktop, iPhone Safari or Android Chrome.
5. If your old app is still showing, clear the old site's browser data or test the new site in a private tab. Remove old service workers and manifest files from the repository.

## Demo logins

- Student code: `DEMO2026`
- Administrator name: `ADMIN`
- Administrator code: `ADMINDEMO2026`

The administrator screen generates two-hour, single-use **local demonstration** codes. Codes are stored in the browser that generated them. They will not work on a student's different phone. The demo credentials are visible in the source and are not secure.

## Features

- Responsive, self-contained HTML/CSS/JavaScript with no Appwrite, account or build process.
- Text input and read selected / read all with the browser's Web Speech API and device-exposed voices.
- Camera photo capture and photo upload using the device's normal file-picker/camera UI.
- OCR using Tesseract.js loaded from a CDN **only when a photo is chosen**. The first use needs internet access and may take time; OCR is performed in the browser. Some browser speech voices may use device/vendor services.
- Two-hour local demonstration codes, one use, and best-effort session ending when the page becomes hidden.

## Important limitations

This is a demonstration, **not secure assessment software**. GitHub Pages cannot securely validate codes or synchronize them across phones. A student could inspect or change browser code/storage. Browser `visibilitychange` cannot guarantee sign-out when a user swipes away, closes or kills Safari, loses connectivity, or opens another app. There is no remote audit trail and no way for this site to prevent cheating. A secure shared backend and managed-device/invigilation controls would be needed for genuine assessment use.

Camera access is requested by the browser when a student chooses Take photo; the app doesn't access the camera in the background. The Web Speech API normally does not ask for permission to speak; it exposes whichever voices the browser makes available. OCR may misread text; check the result before reading. The app does not answer questions.

## Troubleshooting

- **Blank screen:** check that `index.html` is at repository root and GitHub Pages is enabled. This file uses no framework or module imports.
- **Photo not recognised:** check internet access to `cdn.jsdelivr.net`, use a well-lit photo and wait for first-time OCR download.
- **No voice choices:** some iPhone/Android browsers expose only the default voice. Try device speech settings or another browser. The default voice should still speak if supported.
- **Old login still appears:** remove old site files and clear the browser's website data / installed shortcut.
