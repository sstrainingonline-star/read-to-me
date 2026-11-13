# Learning Support — Read To Me V4.3 (mobile-friendly demonstration)

This is a complete replacement package for GitHub Pages. It includes the current student reader, administrator demonstration, and mobile layout fixes. **No Appwrite or other account is required to try the demonstration.**

## Login codes (unchanged)
- Student reader: `DEMO2026`
- Administrator: `ADMINDEMO2026`

These are PUBLIC demonstration codes, not secure passwords. Do not enter real learner information or use this demonstration to control formal assessments.

## Upload the complete package
1. Extract the ZIP.
2. Open your existing GitHub repository and upload **all files inside the folder** to the repository root (the same level as `index.html`). Replace the old files.
3. Delete old `config.js`, `service-worker.js` and any obsolete duplicate versions of the application files. The new package intentionally has no service worker.
4. Under Settings → Pages, confirm the repository is publishing `main` / `(root)`.
5. Open the **published GitHub Pages HTTPS link** on an iPhone or Android phone, not the GitHub repository's file preview. If a previously installed app opens an old screen, remove that home-screen shortcut, clear the site's Safari/Chrome website data, and reopen the HTTPS URL. Refresh once after deployment.
6. Sign in with the same demo codes above.

## Mobile improvements
- Responsive mobile-first layout, touch-sized buttons, iPhone safe-area support, no sideways overflow.
- Photo upload through the photo library, plus a separate "Take a photo with phone" option.
- Live camera preview and Capture & read, with browser camera permission on HTTPS.
- Automatic OCR and read-aloud attempt after scan; on some iPhones Safari blocks speech until a user taps **Read aloud**.
- Phone/browser voice selection, voice test, speed, text size, clear, pause, repeat and stop.
- No Appwrite dependency, and removes registrations for legacy service workers that can keep serving old cached pages.

## Important limits
- Learners and one-time codes created in the administrator demo are saved **only in that same browser**. A code created on your iPhone cannot work on another student's phone without a shared server. The fixed demo student code works on any phone because it is in public JavaScript, but it is reusable and not secure.
- A GitHub Pages website cannot securely authenticate students or enforce one-time codes across different devices. The admin code is also visible to anyone inspecting the code. Never use these demo codes as exam security.
- The OCR engine downloads Tesseract.js and English language data over the internet. Recognition happens in the browser; photos are not intentionally uploaded to an academy server.
- iPhone Safari and Android browsers may offer different system voices. This website cannot download/install extra phone voices.
- The website cannot lock a personal phone, prevent app switching or reliably detect cheating. Obtain approval for any formal assessment use.
