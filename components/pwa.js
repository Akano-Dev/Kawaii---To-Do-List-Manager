/**
 * PWA — Service Worker registration, install prompt, update handling
 */
const PWA = (() => {
  let deferredPrompt = null;
  let installBannerShown = false;

  // ---- Register Service Worker ----
  const registerSW = () => {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // Check for updates every 60s
        setInterval(() => reg.update(), 60000);

        // New SW waiting → show update toast
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(newWorker);
            }
          });
        });

        console.log('🌸 PixiDo SW registered:', reg.scope);
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    });
  };

  // ---- Capture install prompt ----
  const initInstallPrompt = () => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show install banner after 3s if not already installed
      if (!installBannerShown && !isInstalled()) {
        setTimeout(showInstallBanner, 3000);
      }
    });

    // Hide banner when installed
    window.addEventListener('appinstalled', () => {
      hideInstallBanner();
      deferredPrompt = null;
      if (typeof notify === 'function') {
        notify('PixiDo installed! 🎉', '✨');
      }
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    });
  };

  // ---- Check if already running as installed PWA ----
  const isInstalled = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  // ---- Show install banner ----
  const showInstallBanner = () => {
    if (installBannerShown || isInstalled()) return;
    installBannerShown = true;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-banner-inner">
        <div class="pwa-banner-left">
          <span class="pwa-banner-icon">🐱</span>
          <div>
            <div class="pwa-banner-title">Install PixiDo!</div>
            <div class="pwa-banner-sub">Add to home screen for the full app experience ✨</div>
          </div>
        </div>
        <div class="pwa-banner-btns">
          <button class="pwa-install-btn" id="pwaInstallBtn">📲 Install</button>
          <button class="pwa-dismiss-btn" id="pwaDismissBtn">✕</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => banner.classList.add('visible'));

    document.getElementById('pwaInstallBtn').addEventListener('click', triggerInstall);
    document.getElementById('pwaDismissBtn').addEventListener('click', hideInstallBanner);
  };

  // ---- Hide install banner ----
  const hideInstallBanner = () => {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 400);
    }
  };

  // ---- Trigger native install prompt ----
  const triggerInstall = async () => {
    if (!deferredPrompt) {
      // Fallback instructions for iOS / unsupported
      showInstallModal();
      return;
    }
    hideInstallBanner();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted' && navigator.vibrate) {
      navigator.vibrate([30, 20, 30]);
    }
  };

  // ---- iOS install instructions modal ----
  const showInstallModal = () => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const modal = document.createElement('div');
    modal.id = 'pwa-install-modal';
    modal.innerHTML = `
      <div class="pwa-modal-box">
        <div class="pwa-modal-header">
          <span>📲 Install PixiDo</span>
          <button class="pwa-modal-close" id="pwaModalClose">✕</button>
        </div>
        <div class="pwa-modal-body">
          <div class="pwa-modal-mascot">🐱</div>
          <div class="pwa-modal-title">Add to Home Screen</div>
          ${isIOS ? `
            <div class="pwa-modal-steps">
              <div class="pwa-step"><span class="pwa-step-num">1</span> Tap the <strong>Share</strong> button <span style="font-size:18px">⬆️</span></div>
              <div class="pwa-step"><span class="pwa-step-num">2</span> Scroll down and tap <strong>"Add to Home Screen"</strong></div>
              <div class="pwa-step"><span class="pwa-step-num">3</span> Tap <strong>"Add"</strong> — done! 🎉</div>
            </div>
          ` : `
            <div class="pwa-modal-steps">
              <div class="pwa-step"><span class="pwa-step-num">1</span> Tap the <strong>⋮ menu</strong> in your browser</div>
              <div class="pwa-step"><span class="pwa-step-num">2</span> Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></div>
              <div class="pwa-step"><span class="pwa-step-num">3</span> Tap <strong>"Install"</strong> — done! 🎉</div>
            </div>
          `}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));
    document.getElementById('pwaModalClose').addEventListener('click', () => {
      modal.classList.remove('visible');
      setTimeout(() => modal.remove(), 300);
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
      }
    });
  };

  // ---- Update toast ----
  const showUpdateToast = (worker) => {
    const toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.innerHTML = `
      <span>✨ New version available!</span>
      <button id="pwaUpdateBtn" class="pwa-update-btn">Update 🔄</button>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));

    document.getElementById('pwaUpdateBtn').addEventListener('click', () => {
      worker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    });
  };

  // ---- Touch feedback (ripple on tap) ----
  const initTouchFeedback = () => {
    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest('button, .task-item, .category-item, .hero-cta, .nav-btn, .filter-btn, .auth-submit');
      if (!target) return;

      const ripple = document.createElement('span');
      ripple.className = 'touch-ripple';
      const rect = target.getBoundingClientRect();
      const touch = e.touches[0];
      ripple.style.left = (touch.clientX - rect.left) + 'px';
      ripple.style.top  = (touch.clientY - rect.top) + 'px';
      target.style.position = target.style.position || 'relative';
      target.style.overflow = 'hidden';
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    }, { passive: true });
  };

  // ---- Swipe-to-complete on task items ----
  const initSwipeGestures = () => {
    let startX = 0, startY = 0, activeItem = null;

    document.addEventListener('touchstart', (e) => {
      const item = e.target.closest('.task-item');
      if (!item) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      activeItem = item;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!activeItem) return;
      const dx = e.touches[0].clientX - startX;
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dy > 20) { activeItem = null; return; } // vertical scroll, ignore
      if (dx > 10) {
        activeItem.style.transform = `translateX(${Math.min(dx * 0.4, 60)}px)`;
        activeItem.style.background = dx > 40 ? '#f0fdf5' : '';
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!activeItem) return;
      const dx = e.changedTouches[0].clientX - startX;
      activeItem.style.transform = '';
      activeItem.style.background = '';

      if (dx > 80) {
        // Swipe right → toggle complete
        const id = activeItem.dataset.id;
        if (id && typeof Dashboard !== 'undefined') {
          const rect = activeItem.getBoundingClientRect();
          Dashboard.toggleTask(id, rect.left + rect.width / 2, rect.top + rect.height / 2);
          if (navigator.vibrate) navigator.vibrate(30);
        }
      }
      activeItem = null;
    }, { passive: true });
  };

  return { registerSW, initInstallPrompt, initTouchFeedback, initSwipeGestures, triggerInstall, isInstalled };
})();

window.PWA = PWA;
