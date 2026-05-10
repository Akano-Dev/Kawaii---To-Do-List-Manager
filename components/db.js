/**
 * DB — localStorage simulation layer
 * All user data, sessions, and settings are stored here.
 */
const DB = (() => {
  const KEYS = {
    USERS:    'pixido_users',
    SESSION:  'pixido_session',
    SETTINGS: 'pixido_settings',
  };

  // ---- Simple hash (NOT crypto-safe — for demo only) ----
  const hashPass = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }
    return h.toString(36);
  };

  // ---- Users ----
  const getUsers = () => JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
  const saveUsers = (u) => localStorage.setItem(KEYS.USERS, JSON.stringify(u));

  // ---- Session ----
  const getSession = () => JSON.parse(localStorage.getItem(KEYS.SESSION) || 'null');
  const saveSession = (s) => localStorage.setItem(KEYS.SESSION, JSON.stringify(s));
  const clearSession = () => localStorage.removeItem(KEYS.SESSION);

  // ---- Tasks ----
  const getTasks = (uid) => {
    const users = getUsers();
    return (users[uid] && users[uid].tasks) ? users[uid].tasks : [];
  };
  const saveTasks = (uid, tasks) => {
    const users = getUsers();
    if (users[uid]) { users[uid].tasks = tasks; saveUsers(users); }
  };

  // ---- Meta (streak, points, etc.) ----
  const getMeta = (uid) => {
    const users = getUsers();
    return (users[uid] && users[uid].meta)
      ? users[uid].meta
      : { points: 0, streak: 0, lastActive: null, completedTotal: 0 };
  };
  const saveMeta = (uid, meta) => {
    const users = getUsers();
    if (users[uid]) { users[uid].meta = meta; saveUsers(users); }
  };

  // ---- Settings ----
  const getSettings = () => JSON.parse(localStorage.getItem(KEYS.SETTINGS) || JSON.stringify({
    volume: 0.5,
    muted: false,
    bgmEnabled: false,
    theme: 'kawaii',
    background: 'gradient',
    soundEffects: true,
    notifications: true,
  }));
  const saveSettings = (s) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(s));

  // ---- Auth helpers ----
  const registerUser = ({ username, email, password }) => {
    const users = getUsers();
    const emailExists = Object.values(users).some(u => u.email === email);
    if (emailExists) return { error: 'Email already registered!' };

    const AVATARS = ['🐱','🐰','🦊','🐸','🐻','🐼','🦄','🐶'];
    const uid = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

    users[uid] = {
      email,
      username,
      passHash: hashPass(password),
      avatar,
      tasks: [],
      meta: { points: 0, streak: 0, lastActive: null, completedTotal: 0 },
    };
    saveUsers(users);

    const session = { uid, email, username, avatar };
    saveSession(session);
    return { session };
  };

  const loginUser = ({ email, password }) => {
    const users = getUsers();
    const entry = Object.entries(users).find(([, u]) => u.email === email);
    if (!entry) return { error: 'Email not found!' };
    const [uid, userData] = entry;
    if (userData.passHash !== hashPass(password)) return { error: 'Wrong password!' };

    const session = { uid, email, username: userData.username, avatar: userData.avatar || '🐱' };
    saveSession(session);
    return { session };
  };

  return {
    getUsers, saveUsers,
    getSession, saveSession, clearSession,
    getTasks, saveTasks,
    getMeta, saveMeta,
    getSettings, saveSettings,
    registerUser, loginUser,
  };
})();

// Make available globally
window.DB = DB;
