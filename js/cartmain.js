// js/cartmain.js
// Shared helpers for cart: storage, coupons, totals, toast, cart count (with MyShop fallbacks).
(() => {
  'use strict';

  const KEYS = {
    CART: 'myshop_cart',
    USER: 'myshop_user',
    COUPON: 'myshop_coupon'
  };

  const parse = (s, f) => { try { return JSON.parse(s) ?? f; } catch { return f; } };

  // Storage
  function getCart() { return parse(localStorage.getItem(KEYS.CART), []); }
  function saveCart(cart) { localStorage.setItem(KEYS.CART, JSON.stringify(cart)); }
  function getUser() { return parse(localStorage.getItem(KEYS.USER), null); }

  // Coupons
  function getCoupon() { return parse(localStorage.getItem(KEYS.COUPON), null); }
  function saveCoupon(c) { localStorage.setItem(KEYS.COUPON, JSON.stringify(c)); }
  function clearCoupon() { localStorage.removeItem(KEYS.COUPON); }
  function couponNote(code) {
    const up = String(code || '').toUpperCase();
    if (up === 'SAVE10') return '10% off (max ₹1000)';
    if (up === 'WELCOME100') return '₹100 off orders over ₹500';
    if (up === 'FREESHIP') return 'Free shipping';
    return '';
  }
  function hasFreeShippingCoupon(code) {
    return String(code || '').trim().toUpperCase() === 'FREESHIP';
  }

  // Totals
  function computeDiscount(subtotal, code) {
    if (!code || subtotal <= 0) return 0;
    const up = String(code).trim().toUpperCase();
    if (up === 'SAVE10') return Math.min(Math.round(subtotal * 0.10), 1000);
    if (up === 'WELCOME100') return subtotal >= 500 ? 100 : 0;
    return 0;
  }
  function computeShipping(subtotalAfterDiscount, itemCount, hasFreeShip) {
    if (itemCount === 0) return 0;
    if (hasFreeShip) return 0;
    return subtotalAfterDiscount >= 999 ? 0 : 49;
  }

  // UI
  function getCartCount() {
    return getCart().reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  }
  function updateCartCount() {
    if (window.MyShop?.updateCartCount) return window.MyShop.updateCartCount();
    const el = document.getElementById('cartCount');
    if (el) el.textContent = String(getCartCount());
  }
  function showToast(message = '') {
    if (window.MyShop?.showToast) return window.MyShop.showToast(message);
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      Object.assign(el.style, {
        position: 'fixed', bottom: '22px', left: '50%', transform: 'translateX(-50%)',
        minWidth: '200px', maxWidth: '90vw', background: '#222', color: '#fff',
        padding: '12px 14px', borderRadius: '10px', boxShadow: '0 6px 18px rgba(0,0,0,.08)',
        opacity: '0', visibility: 'hidden',
        transition: 'opacity .25s ease, visibility .25s ease, transform .25s ease',
        zIndex: '9999', textAlign: 'center'
      });
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.style.transform = 'translateX(-50%) translateY(-2px)';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.transform = 'translateX(-50%)';
    }, 1800);
  }

  // Misc
  function clampQty(n) { return Math.max(1, Math.min(99, Number(n) || 1)); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // Expose
  window.CartMain = {
    KEYS,
    // storage
    getCart, saveCart, getUser,
    // coupons
    getCoupon, saveCoupon, clearCoupon, couponNote, hasFreeShippingCoupon,
    // totals
    computeDiscount, computeShipping,
    // ui/misc
    getCartCount, updateCartCount, showToast, clampQty, escapeHtml
  };

  document.addEventListener('DOMContentLoaded', updateCartCount);
})();