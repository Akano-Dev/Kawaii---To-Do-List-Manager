/**
 * DB — Firebase Auth + Firestore data layer
 * Drop-in replacement for the old localStorage layer.
 * Same public API: DB.loginUser, DB.registerUser, DB.getTasks, etc.
 *
 * Firebase config: cute-pixel-todo project
 */

// ============================================================
//  FIREBASE INIT (CDN modules loaded in each HTML page)
// ============================================================
const DB = (() => {
  // ---- Firebase config ----
  const firebaseConfig = {
    apiKey:            "AIzaSyCfWX_a1Y8d7-D3dR2BemDvXWb6yVBSl4w",
    authDomain:        "cute-pixel-todo.firebaseapp.com",
    projectId:         "cute-pixel-todo",
    storageBucket:     "cute-pixel-todo.firebasestorage.app",
    messagingSenderId: "914064328910",
    appId:             "1:914064328910:web:28c6a5fbab89ee4d9ce89f",
  };

  // Firebase SDK references (set after CDN loads)
  let _app, _auth, _db;
  let _firebaseReady = false;
  let _readyCallbacks = [];

  const onReady = (fn) => {
    if (_firebaseReady) { fn(); return; }
    _readyCallbacks.push(fn);
  };

  const _markReady = () => {
    _firebaseReady = true;
    _readyCallbacks.forEach(fn => fn());
    _readyCallbacks = [];
  };

  // ---- Init Firebase from CDN globals ----
  const initFirebase = () => {
    try {
      const { initializeApp }   = window.firebaseApp;
      const { getAuth }         = window.firebaseAuth;
      const { getFirestore }    = window.firebaseFirestore;

      _app  = initializeApp(firebaseConfig);
      _auth = getAuth(_app);
      _db   = getFirestore(_app);
      _markReady();
      console.log('🔥 Firebase ready');
    } catch (e) {
      console.error('Firebase init failed:', e);
    }
  };

  // ---- Settings (still localStorage — device-specific prefs) ----
  const SETTINGS_KEY = 'pixido_settings';
  const getSettings = () => JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify({
    volume: 0.5, muted: false, bgmEnabled: false,
    theme: 'kawaii', background: 'gradient',
    soundEffects: true, notifications: true,
  }));
  const saveSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

  // ---- Session cache (localStorage for instant reads across pages) ----
  const SESSION_KEY = 'pixido_session';
  const getSession    = () => JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  const saveSession   = (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  const clearSession  = () => localStorage.removeItem(SESSION_KEY);

  // ---- AVATARS ----
  const AVATARS = ['🐱','🐰','🦊','🐸','🐻','🐼','🦄','🐶'];

  // ============================================================
  //  AUTH
  // ============================================================

  /**
   * Register a new user with Firebase Auth + create Firestore profile.
   * Returns: { session } or { error }
   */
  const registerUser = ({ username, email, password }) => {
    return new Promise((resolve) => {
      onReady(async () => {
        try {
          const { createUserWithEmailAndPassword, updateProfile } =
            window.firebaseAuth;

          const cred = await createUserWithEmailAndPassword(_auth, email, password);
          const user = cred.user;
          const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

          // Update Firebase display name
          await updateProfile(user, { displayName: username });

          // Create Firestore user document
          const { doc, setDoc, serverTimestamp } = window.firebaseFirestore;
          await setDoc(doc(_db, 'users', user.uid), {
            email,
            username,
            avatar,
            createdAt: serverTimestamp(),
            meta: { points: 0, streak: 0, lastActive: null, completedTotal: 0 },
          });

          const session = { uid: user.uid, email, username, avatar };
          saveSession(session);
          resolve({ session });
        } catch (err) {
          const msg = _friendlyError(err.code);
          resolve({ error: msg });
        }
      });
    });
  };

  /**
   * Log in with Firebase Auth.
   * Returns: { session } or { error }
   */
  const loginUser = ({ email, password }) => {
    return new Promise((resolve) => {
      onReady(async () => {
        try {
          const { signInWithEmailAndPassword } = window.firebaseAuth;
          const cred = await signInWithEmailAndPassword(_auth, email, password);
          const user = cred.user;

          // Fetch profile from Firestore
          const { doc, getDoc } = window.firebaseFirestore;
          const snap = await getDoc(doc(_db, 'users', user.uid));
          const profile = snap.exists() ? snap.data() : {};

          const session = {
            uid:      user.uid,
            email:    user.email,
            username: profile.username || user.displayName || 'Kawaii User',
            avatar:   profile.avatar   || '🐱',
          };
          saveSession(session);
          resolve({ session });
        } catch (err) {
          resolve({ error: _friendlyError(err.code) });
        }
      });
    });
  };

  /** Sign out */
  const logoutUser = async () => {
    try {
      const { signOut } = window.firebaseAuth;
      await signOut(_auth);
    } catch {}
    clearSession();
  };

  // ============================================================
  //  TASKS  (Firestore: users/{uid}/tasks — single doc array)
  // ============================================================

  /**
   * Get tasks — returns cached localStorage copy instantly,
   * then syncs from Firestore in background.
   */
  const getTasks = (uid) => {
    const cached = localStorage.getItem(`pixido_tasks_${uid}`);
    return cached ? JSON.parse(cached) : [];
  };

  /** Fetch tasks from Firestore and update local cache */
  const fetchTasks = (uid) => {
    return new Promise((resolve) => {
      onReady(async () => {
        try {
          const { doc, getDoc } = window.firebaseFirestore;
          const snap = await getDoc(doc(_db, 'users', uid));
          const tasks = snap.exists() ? (snap.data().tasks || []) : [];
          localStorage.setItem(`pixido_tasks_${uid}`, JSON.stringify(tasks));
          resolve(tasks);
        } catch (e) {
          console.warn('fetchTasks failed, using cache:', e);
          resolve(getTasks(uid));
        }
      });
    });
  };

  /** Save tasks to Firestore + local cache */
  const saveTasks = (uid, tasks) => {
    // Update local cache immediately (instant UI)
    localStorage.setItem(`pixido_tasks_${uid}`, JSON.stringify(tasks));
    // Persist to Firestore async
    onReady(async () => {
      try {
        const { doc, updateDoc } = window.firebaseFirestore;
        await updateDoc(doc(_db, 'users', uid), { tasks });
      } catch (e) {
        console.warn('saveTasks Firestore error:', e);
      }
    });
  };

  // ============================================================
  //  META  (streak, points, completedTotal)
  // ============================================================

  const getMeta = (uid) => {
    const cached = localStorage.getItem(`pixido_meta_${uid}`);
    return cached
      ? JSON.parse(cached)
      : { points: 0, streak: 0, lastActive: null, completedTotal: 0 };
  };

  const fetchMeta = (uid) => {
    return new Promise((resolve) => {
      onReady(async () => {
        try {
          const { doc, getDoc } = window.firebaseFirestore;
          const snap = await getDoc(doc(_db, 'users', uid));
          const meta = snap.exists() ? (snap.data().meta || {}) : {};
          const full = { points: 0, streak: 0, lastActive: null, completedTotal: 0, ...meta };
          localStorage.setItem(`pixido_meta_${uid}`, JSON.stringify(full));
          resolve(full);
        } catch (e) {
          resolve(getMeta(uid));
        }
      });
    });
  };

  const saveMeta = (uid, meta) => {
    localStorage.setItem(`pixido_meta_${uid}`, JSON.stringify(meta));
    onReady(async () => {
      try {
        const { doc, updateDoc } = window.firebaseFirestore;
        await updateDoc(doc(_db, 'users', uid), { meta });
      } catch (e) {
        console.warn('saveMeta Firestore error:', e);
      }
    });
  };

  // ============================================================
  //  USER PROFILE UPDATE
  // ============================================================
  const updateProfile = (uid, { username, avatar }) => {
    return new Promise((resolve) => {
      onReady(async () => {
        try {
          const { doc, updateDoc } = window.firebaseFirestore;
          const updates = {};
          if (username) updates.username = username;
          if (avatar)   updates.avatar   = avatar;
          await updateDoc(doc(_db, 'users', uid), updates);

          // Update session cache
          const session = getSession();
          if (session && session.uid === uid) {
            if (username) session.username = username;
            if (avatar)   session.avatar   = avatar;
            saveSession(session);
          }
          resolve({ ok: true });
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    });
  };

  // ============================================================
  //  HELPERS
  // ============================================================
  const _friendlyError = (code) => {
    const map = {
      'auth/email-already-in-use':    'Email already registered!',
      'auth/invalid-email':           'Invalid email address!',
      'auth/weak-password':           'Password must be at least 6 characters!',
      'auth/user-not-found':          'Email not found!',
      'auth/wrong-password':          'Wrong password!',
      'auth/invalid-credential':      'Wrong email or password!',
      'auth/too-many-requests':       'Too many attempts. Try again later!',
      'auth/network-request-failed':  'Network error. Check your connection!',
    };
    return map[code] || 'Something went wrong. Please try again!';
  };

  // Debug helper
  const debug = async () => {
    const session = getSession();
    const uid = session?.uid;
    console.group('🔥 PixiDo Firebase Debug');
    console.log('👤 Session:', session);
    console.log('📋 Tasks (cache):', uid ? getTasks(uid) : 'no session');
    console.log('📊 Meta (cache):', uid ? getMeta(uid) : 'no session');
    console.log('⚙️ Settings:', getSettings());
    console.log('🔥 Firebase ready:', _firebaseReady);
    if (uid) {
      const tasks = await fetchTasks(uid);
      console.log('📋 Tasks (Firestore):', tasks);
    }
    console.groupEnd();
  };

  // ---- Stub legacy methods (no longer needed but kept for safety) ----
  const getUsers  = () => ({});
  const saveUsers = () => {};

  return {
    // Core
    initFirebase,
    onReady,
    // Auth
    getSession, saveSession, clearSession,
    registerUser, loginUser, logoutUser,
    // Data
    getTasks, fetchTasks, saveTasks,
    getMeta,  fetchMeta,  saveMeta,
    updateProfile,
    // Settings (local)
    getSettings, saveSettings,
    // Legacy stubs
    getUsers, saveUsers,
    // Debug
    debug,
  };
})();

window.DB = DB;
