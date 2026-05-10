/**
 * UI — shared UI utilities: notifications, confetti, particles, decorations
 */

// ============================================================
//  PARTICLE SYSTEM
// ============================================================
const Particles = (() => {
  let canvas, ctx, particles = [];

  const init = () => {
    canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    tick();
  };

  const create = (x, y, n = 12) => {
    if (!ctx) return;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i + Math.random() * 0.5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 4),
        vy: Math.sin(angle) * (2 + Math.random() * 4),
        life: 1,
        color: ['#ff9dbb','#a8e6cf','#ffd93d','#c7ceea','#ff6b9d'][Math.floor(Math.random() * 5)],
        r: 3 + Math.random() * 4,
      });
    }
  };

  const tick = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.025;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - p.r / 2), Math.round(p.y - p.r / 2), Math.round(p.r), Math.round(p.r));
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  };

  return { init, create };
})();

// ============================================================
//  FLOATING DECORATIONS
// ============================================================
const spawnDeco = (containerId, emojis, count = 3) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'float-deco';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = (10 + Math.random() * 80) + '%';
      el.style.bottom = '10%';
      el.style.animationDelay = (Math.random() * 0.5) + 's';
      container.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }, i * 250);
  }
};

// ============================================================
//  NOTIFICATIONS
// ============================================================
const notify = (msg, emoji = '✨') => {
  const n = document.createElement('div');
  n.className = 'notification';
  n.textContent = emoji + ' ' + msg;
  document.body.appendChild(n);
  setTimeout(() => {
    n.classList.add('out');
    setTimeout(() => n.remove(), 350);
  }, 3000);
};

// ============================================================
//  CONFETTI
// ============================================================
const confetti = (x, y) => {
  const icons = ['💖','⭐','🌸','✨','💛','🍀','🎉'];
  for (let i = 0; i < 12; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.textContent = icons[Math.floor(Math.random() * icons.length)];
    el.style.left = (x + (Math.random() - 0.5) * 120) + 'px';
    el.style.top  = (y - 20) + 'px';
    el.style.animationDelay = (Math.random() * 0.4) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
};

// ============================================================
//  AUDIO MANAGER
// ============================================================
const AudioMgr = (() => {
  let muted = false;
  let bgmPlaying = false;
  let vol = 0.5;

  const SFX = {
    click:    '/sounds/click.mp3',
    add:      '/sounds/add-task.mp3',
    delete:   '/sounds/delete-task.mp3',
    complete: '/sounds/complete-task.mp3',
    notif:    '/sounds/notification.mp3',
    bgm:      '/sounds/bgm.mp3',
  };

  const bgmAudio = new window.Audio(SFX.bgm);
  bgmAudio.loop = true;
  bgmAudio.volume = 0.2;

  const play = (key) => {
    if (muted) return;
    try {
      const a = new window.Audio(SFX[key]);
      a.volume = vol;
      a.play().catch(() => {});
    } catch (e) {}
  };

  const loadSettings = () => {
    const s = DB.getSettings();
    vol = s.volume || 0.5;
    muted = s.muted || false;
    bgmAudio.muted = muted;
    bgmAudio.volume = vol * 0.4;
  };

  return {
    play,
    setVolume(v) {
      vol = parseFloat(v);
      bgmAudio.volume = v * 0.4;
      const s = DB.getSettings();
      s.volume = vol;
      DB.saveSettings(s);
    },
    toggleMute() {
      muted = !muted;
      bgmAudio.muted = muted;
      const s = DB.getSettings();
      s.muted = muted;
      DB.saveSettings(s);
      return muted;
    },
    toggleBGM() {
      if (bgmPlaying) {
        bgmAudio.pause();
        bgmPlaying = false;
      } else {
        bgmAudio.play().catch(() => {});
        bgmPlaying = true;
      }
      return bgmPlaying;
    },
    isMuted: () => muted,
    isBGMPlaying: () => bgmPlaying,
    loadSettings,
  };
})();

// ============================================================
//  NAVBAR BUILDER
// ============================================================
const buildNavbar = (activePage = '') => {
  const session = DB.getSession();
  const loggedIn = !!session;

  const nav = document.getElementById('navbar');
  if (!nav) return;

  const isInPages = window.location.pathname.includes('/pages/');
  const rootPrefix = isInPages ? '../' : '';
  const pagesPrefix = isInPages ? '' : 'pages/';

  nav.innerHTML = `
    <a class="nav-logo" href="${rootPrefix}index.html">✨ PixiDo</a>
    <div class="nav-links">
      <a class="nav-btn secondary ${activePage === 'landing' ? 'active-page' : ''}"
         href="${rootPrefix}index.html">🏠 Home</a>
      ${loggedIn ? `
        <a class="nav-btn primary ${activePage === 'dashboard' ? 'active-page' : ''}"
           href="${pagesPrefix}dashboard.html">📋 Dashboard</a>
        <a class="nav-btn secondary ${activePage === 'profile' ? 'active-page' : ''}"
           href="${pagesPrefix}profile.html">👤 Profile</a>
        <a class="nav-btn secondary ${activePage === 'settings' ? 'active-page' : ''}"
           href="${pagesPrefix}settings.html">⚙️ Settings</a>
        <button class="nav-btn danger" id="navLogoutBtn">👋 Logout</button>
      ` : `
        <a class="nav-btn primary ${activePage === 'login' ? 'active-page' : ''}"
           href="${pagesPrefix}login.html">🔑 Login</a>
        <a class="nav-btn primary ${activePage === 'signup' ? 'active-page' : ''}"
           href="${pagesPrefix}signup.html">🌸 Sign Up</a>
      `}
    </div>
  `;

  const logoutBtn = document.getElementById('navLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      DB.clearSession();
      notify('Logged out! See you soon~ 💖', '👋');
      setTimeout(() => {
        window.location.href = rootPrefix + 'index.html';
      }, 600);
    });
  }
};

// ============================================================
//  SHARED INIT (call on every page)
// ============================================================
const initShared = (activePage = '') => {
  // Build navbar
  buildNavbar(activePage);

  // Init particles
  Particles.init();

  // Load audio settings
  AudioMgr.loadSettings();

  // Click sparkle effect on buttons
  document.addEventListener('click', e => {
    const el = e.target;
    if (
      el.classList.contains('hero-cta') ||
      el.classList.contains('nav-btn') ||
      el.classList.contains('add-task-btn') ||
      el.classList.contains('task-action-btn') ||
      el.classList.contains('auth-submit') ||
      el.classList.contains('settings-save-btn')
    ) {
      Particles.create(e.clientX, e.clientY, 8);
      AudioMgr.play('click');
    }
  });

  // Konami code → floating hearts
  let konamiSeq = [];
  const KONAMI = [38,38,40,40,37,39,37,39,66,65];
  document.addEventListener('keydown', e => {
    konamiSeq.push(e.keyCode);
    konamiSeq = konamiSeq.slice(-10);
    if (konamiSeq.join(',') === KONAMI.join(',')) {
      spawnDeco('floatingHearts', ['💖','💕','🌸','⭐','✨'], 12);
      notify('✨ Konami Code! Bonus hearts! 💖', '🎉');
    }
  });
};

// Expose globally
window.Particles = Particles;
window.spawnDeco = spawnDeco;
window.notify = notify;
window.confetti = confetti;
window.AudioMgr = AudioMgr;
window.buildNavbar = buildNavbar;
window.initShared = initShared;
