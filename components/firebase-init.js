/**
 * firebase-init.js
 * Loads Firebase SDK from CDN and exposes modules as window globals.
 * Must be loaded BEFORE db.js on every page.
 */
(async () => {
  try {
    // Firebase App
    const appMod   = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const authMod  = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const storeMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    // Expose as globals so db.js can access them
    window.firebaseApp       = appMod;
    window.firebaseAuth      = authMod;
    window.firebaseFirestore = storeMod;

    // Now init DB
    DB.initFirebase();
  } catch (e) {
    console.error('Firebase CDN load failed:', e);
  }
})();
