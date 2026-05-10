/**
 * Router — hash-based client-side routing
 * Routes: / (landing), /login, /signup, /dashboard, /settings, /profile
 */
const Router = (() => {
  const ROUTES = {
    '':          'index.html',
    'login':     'pages/login.html',
    'signup':    'pages/signup.html',
    'dashboard': 'pages/dashboard.html',
    'settings':  'pages/settings.html',
    'profile':   'pages/profile.html',
  };

  // Navigate to a route with a pixel transition animation
  const navigate = (route, options = {}) => {
    const { replace = false, skipTransition = false } = options;

    if (skipTransition) {
      _doNavigate(route, replace);
      return;
    }

    // Show pixel transition overlay
    const overlay = document.getElementById('page-transition');
    if (overlay) {
      overlay.classList.add('active');
      setTimeout(() => {
        _doNavigate(route, replace);
        setTimeout(() => overlay.classList.remove('active'), 200);
      }, 250);
    } else {
      _doNavigate(route, replace);
    }
  };

  const _doNavigate = (route, replace) => {
    const target = ROUTES[route];
    if (!target) return;

    // Determine the correct path based on current location
    const isInPages = window.location.pathname.includes('/pages/');
    let url;

    if (route === '') {
      // Going to landing — always go to root
      url = isInPages ? '../index.html' : 'index.html';
    } else {
      url = isInPages ? route + '.html' : 'pages/' + route + '.html';
    }

    if (replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  };

  // Guard: redirect to login if not authenticated
  const requireAuth = () => {
    const session = DB.getSession();
    if (!session) {
      navigate('login', { replace: true, skipTransition: true });
      return false;
    }
    return true;
  };

  // Guard: redirect to dashboard if already authenticated
  const requireGuest = () => {
    const session = DB.getSession();
    if (session) {
      navigate('dashboard', { replace: true, skipTransition: true });
      return false;
    }
    return true;
  };

  return { navigate, requireAuth, requireGuest };
})();

window.Router = Router;
