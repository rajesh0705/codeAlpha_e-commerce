// js/cart.js
// Cart page: render items, qty updates, remove, clear, coupons, totals, checkout, dev seed, legacy migration.
document.addEventListener('DOMContentLoaded', () => {
  const CM = window.CartMain;
  if (!CM) return console.warn('CartMain not loaded. Include cartmain.js before cart.js');

  // Ensure any legacy carts are migrated before rendering
  CM.migrateCartKeys?.();

  // Dev seed: add ?seed=1 to URL to quickly populate the cart
  const qs = new URLSearchParams(location.search);
  if (qs.get('seed') === '1' && !CM.getCart().length) {
    CM.saveCart([
      { id: 101, name: 'Wireless Headphones', price: 3499, qty: 1, image: 'https://picsum.photos/seed/headphones-a/200/150' },
      { id: 104, name: 'Bluetooth Speaker Mini', price: 1999, qty: 2, image: 'https://picsum.photos/seed/speaker-a/200/150' }
    ]);
    console.info('[Cart] Seeded demo items. Remove ?seed=1 when done.');
  }

  const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  // Elements
  const $body = document.getElementById('cartBody');
  const $empty = document.getElementById('emptyState');
  const $layout = document.getElementById('cartLayout');

  const $itemsTotal = document.getElementById('itemsTotal');
  const $discountTotal = document.getElementById('discountTotal');
  const $shippingTotal = document.getElementById('shippingTotal');
  const $grandTotal = document.getElementById('grandTotal');

  const $clear = document.getElementById('clearCartBtn');
  const $checkout = document.getElementById('checkoutBtn');

  const $couponInput = document.getElementById('couponInput');
  const $applyCoupon = document.getElementById('applyCouponBtn');
  const $removeCoupon = document.getElementById('removeCouponBtn');
  const $couponMsg = document.getElementById('couponMsg');

  // Guard: if your HTML IDs don’t match, warn and stop (prevents blank screen confusion)
  if (!$body || !$layout || !$empty) {
    console.warn('[Cart] Required elements missing. Check IDs: cartBody, cartLayout, emptyState.');
    return;
  }

  function render() {
    const cart = CM.getCart();
    const isEmpty = !cart || cart.length === 0;

    // Toggle sections
    $empty.classList.toggle('hidden', !isEmpty);
    $layout.classList.toggle('hidden', isEmpty);

    // Summary + actions
    if ($checkout) $checkout.disabled = isEmpty;
    if ($clear) $clear.disabled = isEmpty;

    // Coupon UI
    const coupon = CM.getCoupon();
    const hasCoupon = !!coupon?.code;
    if ($couponInput) $couponInput.value = coupon?.code || '';
    if ($applyCoupon) $applyCoupon.classList.toggle('hidden', hasCoupon);
    if ($removeCoupon) $removeCoupon.classList.toggle('hidden', !hasCoupon);
    if ($couponMsg) $couponMsg.textContent = coupon?.note || '';

    if (isEmpty) {
      $body.innerHTML = '';
      updateSummary(0, 0);
      CM.updateCartCount();
      return;
    }

    // Build rows
    const rows = cart.map((item) => {
      const price = Number(item.price) || 0;
      const qty = Math.max(1, Number(item.qty) || 1);
      const subtotal = price * qty;
      const img = item.image || '';
      const safeName = CM.escapeHtml(item.name || 'Product');
      const idAttr = item.id != null ? `data-id="${item.id}"` : ''; // support legacy

      return `
        <tr ${idAttr}>
          <td>
            <div class="prod">
              <img src="${img}" alt="${safeName}" loading="lazy" />
              <div>
                <div class="name">${safeName}</div>
                <div class="meta muted">${item.id != null ? `ID: ${item.id}` : ''}</div>
              </div>
            </div>
          </td>
          <td class="right">${INR.format(price)}</td>
          <td class="qty-col">
            <div class="stepper" role="group" aria-label="Quantity for ${safeName}">
              <button class="btn-minus" aria-label="Decrease quantity">−</button>
              <input class="qty-input" type="number" min="1" max="99" step="1" value="${qty}" inputmode="numeric" />
              <button class="btn-plus" aria-label="Increase quantity">+</button>
            </div>
          </td>
          <td class="right">${INR.format(subtotal)}</td>
          <td class="center">
            <button class="remove-btn" aria-label="Remove ${safeName}">Remove</button>
          </td>
        </tr>
      `;
    }).join('');
    $body.innerHTML = rows;

    // Summary
    const subtotal = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
    const itemCount = cart.reduce((n, i) => n + (Number(i.qty) || 0), 0);
    updateSummary(subtotal, itemCount);

    // Header count
    CM.updateCartCount();
  }

  function updateSummary(subtotal, itemCount) {
    const coupon = CM.getCoupon();
    const code = coupon?.code;
    const discount = CM.computeDiscount(subtotal, code);
    const shipping = CM.computeShipping(subtotal - discount, itemCount, CM.hasFreeShippingCoupon(code));
    const grand = Math.max(0, subtotal - discount + shipping);

    if ($itemsTotal) $itemsTotal.textContent = INR.format(subtotal);
    if ($discountTotal) $discountTotal.textContent = `- ${INR.format(discount)}`;
    if ($shippingTotal) $shippingTotal.textContent = INR.format(shipping);
    if ($grandTotal) $grandTotal.textContent = INR.format(grand);
  }

  // Table actions (delegated)
  $body.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;

    // Find index safely (supports legacy rows without data-id by using row index)
    const idAttr = row.getAttribute('data-id');
    const cart = CM.getCart();
    let idx = -1;

    if (idAttr != null) {
      idx = cart.findIndex(i => String(i.id) === String(idAttr));
    } else {
      // Legacy fallback: find by name + price combo of this row
      const name = row.querySelector('.name')?.textContent?.trim() || '';
      const priceText = row.querySelector('td.right')?.textContent || '₹0';
      const priceVal = Number(String(priceText).replace(/[^\d]/g, '')) || 0;
      idx = cart.findIndex(i => (i.name || '') === name && Number(i.price) === priceVal);
    }
    if (idx < 0) return;

    if (e.target.classList.contains('btn-minus')) {
      cart[idx].qty = CM.clampQty((Number(cart[idx].qty) || 1) - 1);
      CM.saveCart(cart);
      render();
    }
    if (e.target.classList.contains('btn-plus')) {
      cart[idx].qty = CM.clampQty((Number(cart[idx].qty) || 1) + 1);
      CM.saveCart(cart);
      render();
    }
    if (e.target.classList.contains('remove-btn')) {
      if (confirm('Remove this item from cart?')) {
        cart.splice(idx, 1);
        CM.saveCart(cart);
        render();
        CM.showToast('Item removed');
      }
    }
  });

  // Quantity change
  $body.addEventListener('change', (e) => {
    const input = e.target;
    if (!input.classList.contains('qty-input')) return;

    const row = input.closest('tr');
    if (!row) return;

    const idAttr = row.getAttribute('data-id');
    const cart = CM.getCart();
    let idx = -1;

    if (idAttr != null) {
      idx = cart.findIndex(i => String(i.id) === String(idAttr));
    } else {
      const name = row.querySelector('.name')?.textContent?.trim() || '';
      const priceText = row.querySelector('td.right')?.textContent || '₹0';
      const priceVal = Number(String(priceText).replace(/[^\d]/g, '')) || 0;
      idx = cart.findIndex(i => (i.name || '') === name && Number(i.price) === priceVal);
    }
    if (idx < 0) return;

    const val = CM.clampQty(Number(input.value) || 1);
    cart[idx].qty = val;
    CM.saveCart(cart);
    render();
  });

  // Clear cart
  $clear?.addEventListener('click', () => {
    if (!CM.getCart().length) return;
    if (confirm('Clear all items from your cart?')) {
      CM.saveCart([]);
      CM.clearCoupon();
      render();
      CM.showToast('Cart cleared');
    }
  });

  // Coupons
  $applyCoupon?.addEventListener('click', () => {
    const code = ($couponInput?.value || '').trim().toUpperCase();
    if (!code) return setCouponMsg('Enter a coupon code');
    const valid = ['SAVE10', 'WELCOME100', 'FREESHIP'];
    if (!valid.includes(code)) return setCouponMsg('Invalid coupon code');
    CM.saveCoupon({ code, note: CM.couponNote(code) });
    CM.showToast(`Coupon applied: ${code}`);
    render();
  });

  $removeCoupon?.addEventListener('click', () => {
    CM.clearCoupon();
    CM.showToast('Coupon removed');
    if ($couponInput) $couponInput.value = '';
    render();
  });

  // Apply coupon on Enter
  $couponInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $applyCoupon?.click();
    }
  });
  // Clear message while typing
  $couponInput?.addEventListener('input', () => setCouponMsg(''));

  // Checkout
  $checkout?.addEventListener('click', () => {
    const cart = CM.getCart();
    if (!cart.length) return;
    const user = CM.getUser();
    if (!user?.name) {
      location.href = 'login.html?next=checkout.html';
      return;
    }
    location.href = 'checkout.html';
  });

  // Sync across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === CM.KEYS.CART || e.key === CM.KEYS.COUPON) render();
  });

  function setCouponMsg(t) { if ($couponMsg) $couponMsg.textContent = t || ''; }

  // Initial render
  render();
});