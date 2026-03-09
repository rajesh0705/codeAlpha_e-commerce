// js/register.js
document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('registerForm');
  if (!form) return;

  const usernameEl = document.getElementById('regUsername');
  const emailEl    = document.getElementById('regEmail');
  const passEl     = document.getElementById('regPassword');
  const confirmEl  = document.getElementById('regConfirmPassword');

  const groupUser  = document.getElementById('group-username');
  const groupEmail = document.getElementById('group-email');
  const groupPass  = document.getElementById('group-password');
  const groupConf  = document.getElementById('group-confirm');

  const msgUser    = document.getElementById('msg-username');
  const msgEmail   = document.getElementById('msg-email');
  const msgPass    = document.getElementById('msg-password');
  const msgConf    = document.getElementById('msg-confirm');

  const globalMsg  = document.getElementById('globalMsg');
  const submitBtn  = document.getElementById('submitBtn');
  const terms      = document.getElementById('terms');
  const termsLink  = document.getElementById('termsLink');
  const togglePw   = document.getElementById('togglePw');
  const togglePw2  = document.getElementById('togglePw2');

  const pwBar      = document.getElementById('pwBar');
  const pwReqsList = document.getElementById('pwReqs');

  const REGISTER_USER_KEY = 'myshopUser';

  // Helpers
  function setGlobalMessage(text, type) {
    if (!globalMsg) return;
    globalMsg.textContent = text || '';
    globalMsg.classList.remove('ok', 'err');
    if (type === 'ok') globalMsg.classList.add('ok');
    if (type === 'err') globalMsg.classList.add('err');
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('loading', loading);
  }

  function setFieldState(group, msgEl, valid, message) {
    if (!group) return;
    group.classList.remove('valid', 'invalid');
    if (valid) {
      group.classList.add('valid');
      if (msgEl) msgEl.textContent = '';
    } else {
      group.classList.add('invalid');
      if (msgEl) msgEl.textContent = message || '';
    }
  }

  // Validation functions
  function validateUsername() {
    const v = usernameEl.value.trim();
    const ok = v.length >= 3;
    setFieldState(groupUser, msgUser, ok, 'At least 3 characters.');
    return ok;
  }

  function validateEmail() {
    const v = emailEl.value.trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const ok = re.test(v);
    setFieldState(groupEmail, msgEmail, ok, 'Enter a valid email address.');
    return ok;
  }

  function analyzePassword(pwd) {
    const len     = pwd.length >= 8;
    const hasNum  = /\d/.test(pwd);
    const hasUp   = /[A-Z]/.test(pwd);
    const hasSpec = /[^A-Za-z0-9]/.test(pwd);

    let score = 0;
    if (len) score++;
    if (hasNum) score++;
    if (hasUp) score++;
    if (hasSpec) score++;

    return { len, hasNum, hasUp, hasSpec, score };
  }

  function updatePasswordUI() {
    const pwd = passEl.value;
    const info = analyzePassword(pwd);

    // requirements list
    if (pwReqsList) {
      pwReqsList.querySelectorAll('li').forEach(li => {
        const rule = li.dataset.rule;
        let ok = false;
        if (rule === 'len')     ok = info.len;
        if (rule === 'num')     ok = info.hasNum;
        if (rule === 'upper')   ok = info.hasUp;
        if (rule === 'special') ok = info.hasSpec;
        li.classList.toggle('ok', ok);
      });
    }

    // strength bar
    if (pwBar) {
      let width = 0;
      let cls = '';
      if (info.score === 1)  { width = 25; cls = ''; }
      if (info.score === 2)  { width = 50; cls = 'fair'; }
      if (info.score === 3)  { width = 75; cls = 'good'; }
      if (info.score >= 4)   { width = 100; cls = 'strong'; }

      pwBar.style.width = width + '%';
      pwBar.classList.remove('fair', 'good', 'strong');
      if (cls) pwBar.classList.add(cls);
    }

    const allOk = info.len && info.hasNum && info.hasUp && info.hasSpec;
    setFieldState(
      groupPass,
      msgPass,
      allOk,
      'Use at least 8 chars, a number, uppercase letter, and symbol.'
    );
    return allOk;
  }

  function validateConfirm() {
    const pwd = passEl.value;
    const conf = confirmEl.value;
    const ok = conf.length > 0 && pwd === conf;
    setFieldState(groupConf, msgConf, ok, 'Passwords do not match.');
    return ok;
  }

  // Toggle password visibility
  function attachToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(hidden));
      // Keep same icon glyph, just change type
      input.focus();
    });
  }
  attachToggle(togglePw, passEl);
  attachToggle(togglePw2, confirmEl);

  // Live validation
  usernameEl.addEventListener('input', validateUsername);
  emailEl.addEventListener('input', validateEmail);
  passEl.addEventListener('input', () => {
    updatePasswordUI();
    if (confirmEl.value) validateConfirm();
  });
  confirmEl.addEventListener('input', validateConfirm);

  // Terms link (demo)
  if (termsLink) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.MyShop?.showToast?.('Terms & Conditions page not implemented in this demo.');
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    setGlobalMessage('', '');

    const okUser  = validateUsername();
    const okEmail = validateEmail();
    const okPass  = updatePasswordUI();
    const okConf  = validateConfirm();
    const okTerms = terms.checked;

    if (!okTerms) {
      setGlobalMessage('Please accept the Terms & Conditions.', 'err');
    }

    if (!(okUser && okEmail && okPass && okConf && okTerms)) {
      return;
    }

    // All good -> "register"
    setLoading(true);
    setGlobalMessage('Creating your account...', '');

    const user = {
      username: usernameEl.value.trim(),
      email: emailEl.value.trim(),
      password: passEl.value  // demo only; never store plain text in real apps
    };

    // Simulate API delay
    setTimeout(() => {
      localStorage.setItem(REGISTER_USER_KEY, JSON.stringify(user));

      // Remember last user for login form
      window.MyShop?.rememberLastUser?.(user.username);
      window.MyShop?.showToast?.('Account created. You can log in now.');

      setGlobalMessage('Registration successful! Redirecting to login...', 'ok');

      setTimeout(() => {
        location.href = 'login.html';
      }, 1200);

      setLoading(false);
    }, 800);
  });
});