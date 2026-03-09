// js/main.js
// Shared utilities for MyShop: auth, cart, toast, header UI
(() => {
  'use strict';

  const CART_KEY      = 'myshop_cart';
  const USER_KEY      = 'myshop_user';
  const LAST_USER_KEY = 'myshop_last_user';

  // ---------- Safe JSON parse ----------
  const parse = (str, fallback) => {
    try {
      return JSON.parse(str) ?? fallback;
    } catch {
      return fallback;
    }
  };

  // =============== Cart ===============
  const getCart = () => parse(localStorage.getItem(CART_KEY), []);

  const saveCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  };

  const getCartCount = () =>
    getCart().reduce((sum, item) => sum + (item.qty || 0), 0);

  function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = String(getCartCount());
  }

  function addToCart(product, qty = 1) {
    if (!product || !product.id) return;

    const cart   = getCart();
    const addQty = Math.max(1, Number(qty) || 1);
    const found  = cart.find((i) => i.id === product.id);

    if (found) {
      found.qty += addQty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || product.image,
        qty: addQty,
      });
    }

    saveCart(cart);
    updateCartCount();
    showToast(`Added ${addQty} × "${product.name}" to cart`);
  }

  // =============== Auth ===============
  const getUser = () => parse(localStorage.getItem(USER_KEY), null);

  const setUser = (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('myshop:userchange'));
  };

  const clearUser = () => {
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('myshop:userchange'));
  };

  function initAuthUI() {
    const btn = document.getElementById('loginBtn');
    if (!btn) return;

    const user = getUser();

    if (user?.name) {
      // Logged in -> show "Logout (name)"
      btn.textContent = `Logout (${user.name})`;
      btn.href = '#';
      btn.onclick = (e) => {
        e.preventDefault();
        clearUser();
        showToast('Logged out');

        // If not on login page, reload to refresh header state
        const onLogin = /(^|\/)login\.html?$/i.test(location.pathname);
        if (!onLogin) location.reload();
      };
    } else {
      // Not logged in -> show "Login" link
      btn.textContent = 'Login';
      btn.href = 'login.html';
      btn.onclick = null;
    }
  }

  // Optional: remember last username (for login.js to prefill)
  function rememberLastUser(username) {
    if (username) {
      localStorage.setItem(LAST_USER_KEY, username);
    }
  }

  // =============== Toast ===============
  function showToast(message = '') {
    let el = document.getElementById('toast');

    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
    }

    el.textContent = message;
    el.classList.add('show');

    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 1800);
  }

  // =============== Cross-tab sync ===============
  window.addEventListener('storage', (e) => {
    if (e.key === USER_KEY) initAuthUI();
    if (e.key === CART_KEY) updateCartCount();
  });

  // Sync in same tab after setUser/clearUser
  window.addEventListener('myshop:userchange', initAuthUI);

  // =============== Init on page load ===============
  document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    initAuthUI();
  });

  // =============== Expose public API ===============
  window.MyShop = {
    // Cart
    addToCart,
    updateCartCount,
    // Auth
    getUser,
    setUser,
    logout: clearUser,
    rememberLastUser,
    // UI
    showToast,
  };
})();