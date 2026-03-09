// Shared site utilities: cart, auth UI, toast
(() => {
  const CART_KEY = 'myshop_cart';
  const USER_KEY = 'myshop_user';

  const getCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  };
  const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + (item.qty || 0), 0);
  }
  function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = String(getCartCount());
  }

  function addToCart(product, qty = 1) {
    if (!product || !product.id) return;
    const cart = getCart();
    const existing = cart.find((i) => i.id === product.id);
    const addQty = Math.max(1, Number(qty) || 1);

    if (existing) {
      existing.qty += addQty;
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
    showToast(`Added ${addQty} × "${product.name}" to cart 🛒`);
  }

  function showToast(message = '') {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function initAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;
    let user = null;
    try { user = JSON.parse(localStorage.getItem(USER_KEY)); } catch {}

    if (user && user.name) {
      loginBtn.textContent = `Logout (${user.name})`;
      loginBtn.href = '#';
      loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem(USER_KEY);
        location.reload();
      }, { once: true });
    } else {
      loginBtn.textContent = 'Login';
      loginBtn.href = 'login.html';
    }
  }

  window.MyShop = { addToCart, updateCartCount, showToast };

  document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    initAuthUI();
  });
})();