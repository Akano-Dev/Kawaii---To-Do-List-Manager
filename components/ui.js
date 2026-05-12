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
    // Auto-resume BGM if it was playing before page navigation
    if (localStorage.getItem('pixido_bgm_playing') === '1' && !bgmPlaying) {
      // Wait for first user interaction to comply with autoplay policy
      const resume = () => {
        startBGM();
        document.removeEventListener('click', resume);
        document.removeEventListener('keydown', resume);
        document.removeEventListener('touchstart', resume);
      };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
      document.addEventListener('touchstart', resume, { once: true });
    }
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
        localStorage.setItem('pixido_bgm_playing', '0');
      } else {
        startBGM();
        localStorage.setItem('pixido_bgm_playing', '1');
      }
      return bgmPlaying;
    },
    isMuted: () => muted,
    isBGMPlaying: () => bgmPlaying,
    loadSettings,
  };
})();

// ============================================================
//  THEME MANAGER — applies CSS variable overrides per theme
// ============================================================
const ThemeManager = (() => {
  const THEMES = {
    kawaii:   { '--pink':'#ff9dbb','--pink-dark':'#ff6b9d','--pink-pale':'#ffeef7','--mint':'#a8e6cf','--mint-dark':'#5ec38a','--lavender':'#c7ceea','--yellow':'#ffd93d','--bg-start':'#ffb3e6','--bg-mid':'#c7ceea','--bg-end':'#a8e6cf','--ink':'#2d2d2d','--shadow':'#555' },
    midnight: { '--pink':'#9b59b6','--pink-dark':'#8e44ad','--pink-pale':'#2c1654','--mint':'#1abc9c','--mint-dark':'#16a085','--lavender':'#34495e','--yellow':'#f39c12','--bg-start':'#1a1a2e','--bg-mid':'#16213e','--bg-end':'#0f3460','--ink':'#ecf0f1','--shadow':'#000' },
    forest:   { '--pink':'#a8d8a8','--pink-dark':'#5a9e5a','--pink-pale':'#e8f5e8','--mint':'#7ec8a0','--mint-dark':'#4a9e6a','--lavender':'#b8d4b8','--yellow':'#d4c56a','--bg-start':'#2d5a27','--bg-mid':'#4a7c59','--bg-end':'#a8e6cf','--ink':'#1a2e1a','--shadow':'#0a1a0a' },
    sunset:   { '--pink':'#ff6b6b','--pink-dark':'#ee5a24','--pink-pale':'#fff0f0','--mint':'#ffd93d','--mint-dark':'#f9ca24','--lavender':'#ffb347','--yellow':'#ff9f43','--bg-start':'#ff6b6b','--bg-mid':'#ffd93d','--bg-end':'#ffb347','--ink':'#2d1a00','--shadow':'#8b3a00' },
    ocean:    { '--pink':'#00b4d8','--pink-dark':'#0077b6','--pink-pale':'#caf0f8','--mint':'#90e0ef','--mint-dark':'#48cae4','--lavender':'#ade8f4','--yellow':'#f0e68c','--bg-start':'#0077b6','--bg-mid':'#00b4d8','--bg-end':'#90e0ef','--ink':'#03045e','--shadow':'#023e8a' },
    sakura:   { '--pink':'#ff9dbb','--pink-dark':'#e75480','--pink-pale':'#fff0f5','--mint':'#ffb7c5','--mint-dark':'#ff69b4','--lavender':'#ffc0cb','--yellow':'#ffe4e1','--bg-start':'#ffb7c5','--bg-mid':'#ff9dbb','--bg-end':'#ffeef7','--ink':'#4a0020','--shadow':'#8b0040' },
  };

  const apply = (themeName) => {
    const theme = THEMES[themeName] || THEMES.kawaii;
    const root = document.documentElement;
    Object.entries(theme).forEach(([k, v]) => root.style.setProperty(k, v));
    // Update body background
    if (theme['--bg-start']) {
      document.body.style.background = `linear-gradient(135deg, ${theme['--bg-start']} 0%, ${theme['--bg-mid']} 40%, ${theme['--bg-end']} 100%)`;
    }
    localStorage.setItem('pixido_theme', themeName);
  };

  const loadSaved = () => {
    const saved = localStorage.getItem('pixido_theme') ||
                  (DB.getSettings().theme) || 'kawaii';
    apply(saved);
    return saved;
  };

  return { apply, loadSaved, THEMES };
})();

window.ThemeManager = ThemeManager;
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
//  POKÉMON CORNER WIDGET
//  Fetches a random kawaii Pokémon sprite from PokeAPI
//  and shows it bouncing in the bottom-right corner
// ============================================================
const spawnPokemonWidget = () => {
  // Curated list of cute/kawaii Pokémon IDs
  const CUTE_POKEMON = [
    35,  // Clefairy
    39,  // Jigglypuff
    52,  // Meowth
    54,  // Psyduck
    133, // Eevee
    175, // Togepi
    183, // Marill
    196, // Espeon
    197, // Umbreon
    216, // Teddiursa
    300, // Skitty
    311, // Plusle
    312, // Minun
    351, // Castform
    417, // Pachirisu
    427, // Buneary
    468, // Togekiss
    470, // Leafeon
    471, // Glaceon
    700, // Sylveon
    702, // Dedenne
    730, // Primarina
    778, // Mimikyu
    856, // Hatenna
  ];

  const id = CUTE_POKEMON[Math.floor(Math.random() * CUTE_POKEMON.length)];
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

  const widget = document.createElement('div');
  widget.id = 'pokemon-widget';
  widget.innerHTML = `
    <img src="${spriteUrl}" alt="Pokémon buddy" id="pokemon-sprite"
         onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png'">
    <div id="pokemon-speech" class="pokemon-speech hidden"></div>
  `;
  document.body.appendChild(widget);

  // Random encouraging messages
  const MESSAGES = [
    '✨ You can do it!',
    '🌸 Stay kawaii!',
    '💖 Keep going!',
    '⭐ Amazing work!',
    '🎉 You\'re on fire!',
    '🍀 Good luck today!',
    '💪 Believe in you!',
    '🌈 Stay productive!',
  ];

  // Show speech bubble on click
  const sprite = widget.querySelector('#pokemon-sprite');
  const speech = widget.querySelector('#pokemon-speech');
  let speechTimeout;
  sprite.addEventListener('click', () => {
    speech.textContent = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    speech.classList.remove('hidden');
    AudioMgr.play('notif');
    clearTimeout(speechTimeout);
    speechTimeout = setTimeout(() => speech.classList.add('hidden'), 2500);
  });

  // Cycle to new Pokémon every 5 minutes
  setInterval(() => {
    const newId = CUTE_POKEMON[Math.floor(Math.random() * CUTE_POKEMON.length)];
    sprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${newId}.png`;
    sprite.onerror = () => { sprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${newId}.png`; };
  }, 5 * 60 * 1000);
};

// ============================================================
//  SHARED INIT (call on every page)
// ============================================================
const initShared = (activePage = '') => {
  // Apply saved theme immediately
  ThemeManager.loadSaved();

  // Build navbar
  buildNavbar(activePage);

  // Init particles
  Particles.init();

  // Load audio settings (also handles BGM auto-resume)
  AudioMgr.loadSettings();

  // Spawn Pokémon corner widget
  spawnPokemonWidget();

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
window.ThemeManager = ThemeManager;
window.buildNavbar = buildNavbar;
window.initShared = initShared;
window.spawnPokemonWidget = spawnPokemonWidget;
