// js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('loginForm');
  const userInp   = document.getElementById('username');
  const passInp   = document.getElementById('password');
  const submitBtn = document.getElementById('submitBtn');
  const toggleBtn = document.getElementById('togglePass');
  const msg       = document.getElementById('message');
  const capsTip   = document.getElementById('capsTip');
  const remember  = document.getElementById('rememberMe');
  const forgot    = document.getElementById('forgotLink');

  if (!form) return;

  // Key used by register.js to store a registered user (demo only)
  const REGISTER_USER_KEY = 'myshopUser';
  const LAST_USER_KEY     = 'myshop_last_user';

  // Prefill last used username
  const last = localStorage.getItem(LAST_USER_KEY);
  if (last && userInp) {
    userInp.value = last;
  }

  // ----- Toggle password visibility -----
  if (toggleBtn && passInp) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = passInp.type === 'password';
      passInp.type = isHidden ? 'text' : 'password';
      toggleBtn.setAttribute('aria-pressed', String(isHidden));
      // Keep icon as in HTML; just change type
      passInp.focus();
    });
  }

  // ----- Caps Lock hint -----
  function handleCaps(e) {
    if (!capsTip) return;
    const on = e.getModifierState && e.getModifierState('CapsLock');
    capsTip.textContent = on ? 'Caps Lock is ON' : '';
  }
  if (passInp) {
    passInp.addEventListener('keydown', handleCaps);
    passInp.addEventListener('keyup', handleCaps);
  }

  // ----- UI helpers -----
  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('loading', loading);
  }

  function showMessage(text, type) {
    if (!msg) return;
    msg.textContent = text || '';
    msg.classList.remove('ok', 'err');
    if (type === 'ok') msg.classList.add('ok');
    if (type === 'err') msg.classList.add('err');
  }

  // ----- Authentication logic -----
  // 1) Check user created via register.html (stored in REGISTER_USER_KEY)
  // 2) Fallback to demo accounts: admin/demo/user with password 1234
  function authenticate(username, password) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 1) Registered user
        const stored = localStorage.getItem(REGISTER_USER_KEY);
        if (stored) {
          try {
            const regUser = JSON.parse(stored);
            if (username === regUser.username && password === regUser.password) {
              return resolve({ name: regUser.username, role: 'user', source: 'registered' });
            }
          } catch {
            // ignore parse errors
          }
        }

        // 2) Demo credentials
        const isDemoValid =
          (username === 'admin' && password === '1234') ||
          (username === 'demo'  && password === '1234') ||
          (username === 'user'  && password === '1234');

        if (isDemoValid) {
          const role = username === 'admin' ? 'admin' : 'user';
          return resolve({ name: username, role, source: 'demo' });
        }

        resolve(null);
      }, 700); // simulate API delay
    });
  }

  // ----- Submit handler -----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!userInp || !passInp) return;

    const username = userInp.value.trim();
    const password = passInp.value;

    if (!username || !password) {
      showMessage('Please enter username and password.', 'err');
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 300);
      return;
    }

    setLoading(true);
    showMessage('Checking credentials...');

    const user = await authenticate(username, password);

    if (user) {
      const session = {
        name: user.name,
        role: user.role,
        ts: Date.now(),
        remember: !!(remember && remember.checked),
      };

      // Use MyShop API if available (from main.js)
      if (window.MyShop?.setUser) {
        window.MyShop.setUser(session);
        window.MyShop.rememberLastUser?.(username);
      } else {
        // Fallback: direct localStorage (if main.js is not loaded)
        localStorage.setItem('myshop_user', JSON.stringify(session));
        localStorage.setItem(LAST_USER_KEY, username);
      }

      showMessage('Login successful! Redirecting...', 'ok');
      window.MyShop?.showToast?.(`Welcome, ${user.name}`);

      // Redirect to ?next=... or home.html
      const params = new URLSearchParams(location.search);
      const next = params.get('next');
      setTimeout(() => {
        location.href = next || 'home.html';
      }, 900);
    } else {
      showMessage('Invalid username or password.', 'err');
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 300);
    }

    setLoading(false);
  });

  // Clear error when typing again
  [userInp, passInp].forEach((el) =>
    el?.addEventListener('input', () => {
      if (msg && msg.textContent) showMessage('');
    })
  );

  // "Forgot password" demo
  if (forgot) {
    forgot.addEventListener('click', (e) => {
      e.preventDefault();
      window.MyShop?.showToast?.('Password reset flow is not implemented in this demo.');
    });
  }
});