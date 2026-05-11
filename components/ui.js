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
//  AUDIO MANAGER  (Web Audio API — no files needed)
// ============================================================
const AudioMgr = (() => {
  let muted = false;
  let bgmPlaying = false;
  let vol = 0.5;
  let actx = null;          // AudioContext (created on first user gesture)
  let masterGain = null;    // master gain node
  let bgmGain = null;       // BGM gain node
  let bgmNodes = [];        // active BGM oscillator/source nodes
  let bgmScheduler = null;  // setInterval handle for BGM sequencer

  // ---- Lazy AudioContext init (browsers require user gesture) ----
  const getCtx = () => {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = actx.createGain();
      masterGain.gain.value = vol;
      masterGain.connect(actx.destination);

      bgmGain = actx.createGain();
      bgmGain.gain.value = 0.18;
      bgmGain.connect(masterGain);
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  };

  // ---- SFX: synthesized pixel sounds ----
  const playSFX = (type) => {
    if (muted) return;
    try {
      const ctx = getCtx();
      const g = ctx.createGain();
      g.connect(masterGain);
      const o = ctx.createOscillator();
      o.connect(g);
      const now = ctx.currentTime;

      switch (type) {
        case 'click':
          o.type = 'square';
          o.frequency.setValueAtTime(880, now);
          o.frequency.exponentialRampToValueAtTime(440, now + 0.06);
          g.gain.setValueAtTime(vol * 0.15, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          o.start(now); o.stop(now + 0.08);
          break;
        case 'add':
          o.type = 'sine';
          o.frequency.setValueAtTime(523, now);
          o.frequency.setValueAtTime(659, now + 0.07);
          o.frequency.setValueAtTime(784, now + 0.14);
          g.gain.setValueAtTime(vol * 0.2, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          o.start(now); o.stop(now + 0.25);
          break;
        case 'complete':
          // Cheerful ascending arpeggio
          [523, 659, 784, 1047].forEach((freq, i) => {
            const oo = ctx.createOscillator();
            const gg = ctx.createGain();
            oo.connect(gg); gg.connect(masterGain);
            oo.type = 'sine';
            const t = now + i * 0.08;
            oo.frequency.setValueAtTime(freq, t);
            gg.gain.setValueAtTime(vol * 0.22, t);
            gg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            oo.start(t); oo.stop(t + 0.18);
          });
          return;
        case 'delete':
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(300, now);
          o.frequency.exponentialRampToValueAtTime(80, now + 0.15);
          g.gain.setValueAtTime(vol * 0.15, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          o.start(now); o.stop(now + 0.15);
          break;
        case 'notif':
          o.type = 'sine';
          o.frequency.setValueAtTime(784, now);
          o.frequency.setValueAtTime(1047, now + 0.1);
          g.gain.setValueAtTime(vol * 0.18, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          o.start(now); o.stop(now + 0.22);
          break;
        default:
          o.stop(); return;
      }
    } catch (e) {}
  };

  // ---- BGM: lofi kawaii chord sequencer ----
  // Chord progression: Cmaj7 → Am7 → Fmaj7 → G7  (lofi classic)
  const CHORDS = [
    [261.63, 329.63, 392.00, 493.88],  // Cmaj7
    [220.00, 261.63, 329.63, 440.00],  // Am7
    [174.61, 220.00, 261.63, 349.23],  // Fmaj7
    [196.00, 246.94, 293.66, 392.00],  // G7
  ];
  const BASS_NOTES = [130.81, 110.00, 87.31, 98.00]; // C2 A1 F1 G1
  const BEAT_HZ   = 1.4; // ~84 BPM (lofi tempo)
  let chordIdx = 0;
  let beatCount = 0;

  const scheduleChord = () => {
    if (!bgmPlaying || muted) return;
    const ctx = getCtx();
    const now = ctx.currentTime;
    const chord = CHORDS[chordIdx % CHORDS.length];
    const bassFreq = BASS_NOTES[chordIdx % BASS_NOTES.length];
    const chordDur = 4 / BEAT_HZ; // 4 beats per chord

    // --- Soft pad chord (sine + slight detune) ---
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;

      osc.type = 'sine';
      osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.003); // tiny detune
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bgmGain);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.28 / chord.length, now + 0.12);
      gain.gain.setValueAtTime(0.28 / chord.length, now + chordDur - 0.15);
      gain.gain.linearRampToValueAtTime(0, now + chordDur);

      osc.start(now);
      osc.stop(now + chordDur);
      bgmNodes.push(osc);
    });

    // --- Warm bass note ---
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 400;
    bass.type = 'triangle';
    bass.frequency.value = bassFreq;
    bass.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(bgmGain);
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.55, now + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    bass.start(now);
    bass.stop(now + 0.65);
    bgmNodes.push(bass);

    // --- Hi-hat on every beat ---
    for (let b = 0; b < 4; b++) {
      const t = now + b / BEAT_HZ;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let s = 0; s < data.length; s++) data[s] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hgain = ctx.createGain();
      const hfilter = ctx.createBiquadFilter();
      hfilter.type = 'highpass';
      hfilter.frequency.value = 8000;
      src.connect(hfilter);
      hfilter.connect(hgain);
      hgain.connect(bgmGain);
      // Accent on beat 1 & 3, ghost on 2 & 4
      const vel = (b % 2 === 0) ? 0.06 : 0.025;
      hgain.gain.setValueAtTime(vel, t);
      hgain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      src.start(t);
      bgmNodes.push(src);
    }

    // --- Soft kick on beat 1 & 3 ---
    [0, 2].forEach(b => {
      const t = now + b / BEAT_HZ;
      const kick = ctx.createOscillator();
      const kgain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(160, t);
      kick.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      kick.connect(kgain);
      kgain.connect(bgmGain);
      kgain.gain.setValueAtTime(0.7, t);
      kgain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      kick.start(t);
      kick.stop(t + 0.2);
      bgmNodes.push(kick);
    });

    // --- Snare on beat 2 & 4 ---
    [1, 3].forEach(b => {
      const t = now + b / BEAT_HZ;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let s = 0; s < data.length; s++) data[s] = (Math.random() * 2 - 1) * Math.exp(-s / (ctx.sampleRate * 0.04));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const sgain = ctx.createGain();
      const sfilter = ctx.createBiquadFilter();
      sfilter.type = 'bandpass';
      sfilter.frequency.value = 2000;
      src.connect(sfilter);
      sfilter.connect(sgain);
      sgain.connect(bgmGain);
      sgain.gain.setValueAtTime(0.18, t);
      sgain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      src.start(t);
      bgmNodes.push(src);
    });

    chordIdx++;
    beatCount++;
  };

  const startBGM = () => {
    if (bgmPlaying) return;
    bgmPlaying = true;
    chordIdx = 0;
    scheduleChord();
    // Schedule next chord every 4 beats
    bgmScheduler = setInterval(() => {
      if (!bgmPlaying) return;
      // Clean up old nodes
      bgmNodes = bgmNodes.filter(n => {
        try { return n.playbackState !== 3; } catch { return false; }
      });
      scheduleChord();
    }, (4 / BEAT_HZ) * 1000);
  };

  const stopBGM = () => {
    bgmPlaying = false;
    clearInterval(bgmScheduler);
    bgmScheduler = null;
    bgmNodes.forEach(n => { try { n.stop(); } catch {} });
    bgmNodes = [];
  };

  const loadSettings = () => {
    const s = DB.getSettings();
    vol = s.volume || 0.5;
    muted = s.muted || false;
    if (masterGain) masterGain.gain.value = muted ? 0 : vol;
  };

  return {
    play: playSFX,
    setVolume(v) {
      vol = parseFloat(v);
      if (masterGain) masterGain.gain.value = muted ? 0 : vol;
      const s = DB.getSettings();
      s.volume = vol;
      DB.saveSettings(s);
    },
    toggleMute() {
      muted = !muted;
      if (masterGain) masterGain.gain.value = muted ? 0 : vol;
      const s = DB.getSettings();
      s.muted = muted;
      DB.saveSettings(s);
      return muted;
    },
    toggleBGM() {
      if (bgmPlaying) {
        stopBGM();
      } else {
        startBGM();
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
      DB.logoutUser().then(() => {
        notify('Logged out! See you soon~ 💖', '👋');
        setTimeout(() => {
          window.location.href = rootPrefix + 'index.html';
        }, 600);
      });
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
