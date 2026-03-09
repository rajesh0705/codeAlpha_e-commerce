// js/checkout.js
// Checkout: loads cart, pre-fills address, validates form & payment, computes totals, places order.
document.addEventListener('DOMContentLoaded', () => {
  const CART_KEY = 'myshop_cart';
  const USER_KEY = 'myshop_user';
  const COUPON_KEY = 'myshop_coupon';
  const ADDRESS_KEY = 'myshop_address';
  const ORDERS_KEY = 'myshop_orders';
  const LAST_ORDER_KEY = 'myshop_last_order_id';

  const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  // Elements
  const $layout = document.getElementById('checkoutLayout');
  const $empty = document.getElementById('emptyState');

  // Form fields
  const $form = document.getElementById('checkoutForm');
  const $name = document.getElementById('fullName');
  const $phone = document.getElementById('phone');
  const $addr1 = document.getElementById('address1');
  const $addr2 = document.getElementById('address2');
  const $city = document.getElementById('city');
  const $state = document.getElementById('state');
  const $zip = document.getElementById('zip');
  const $save = document.getElementById('saveAddress');
  const $status = document.getElementById('statusMsg');

  // Payment fields
  const $radios = document.querySelectorAll('input[name="payment"]');
  const $cardBox = document.getElementById('cardFields');
  const $upiBox = document.getElementById('upiField');
  const $cardNumber = document.getElementById('cardNumber');
  const $cardName = document.getElementById('cardName');
  const $cardExpiry = document.getElementById('cardExpiry');
  const $cardCvv = document.getElementById('cardCvv');
  const $upiId = document.getElementById('upiId');

  // Summary
  const $itemsList = document.getElementById('itemsList');
  const $itemsTotal = document.getElementById('itemsTotal');
  const $discountTotal = document.getElementById('discountTotal');
  const $shippingTotal = document.getElementById('shippingTotal');
  const $grandTotal = document.getElementById('grandTotal');
  const $couponTag = document.getElementById('couponTag');
  const $placeBtn = document.getElementById('placeOrderBtn');

  // Helpers: storage
  const parse = (s, f) => { try { return JSON.parse(s) ?? f; } catch { return f; } };
  const getUser = () => parse(localStorage.getItem(USER_KEY), null);
  const getCart = () => parse(localStorage.getItem(CART_KEY), []);
  const saveCart = (c) => localStorage.setItem(CART_KEY, JSON.stringify(c));
  const getCoupon = () => parse(localStorage.getItem(COUPON_KEY), null);
  const clearCoupon = () => localStorage.removeItem(COUPON_KEY);
  const getAddress = () => parse(localStorage.getItem(ADDRESS_KEY), null);
  const saveAddress = (a) => localStorage.setItem(ADDRESS_KEY, JSON.stringify(a));
  const loadOrders = () => parse(localStorage.getItem(ORDERS_KEY), []);
  const saveOrders = (list) => localStorage.setItem(ORDERS_KEY, JSON.stringify(list));

  // Require login
  const user = getUser();
  if (!user?.name) {
    location.href = 'login.html?next=checkout.html';
    return;
  }

  // Load cart
  const cart = getCart();
  if (!cart.length) {
    $empty.classList.remove('hidden');
    $layout.classList.add('hidden');
    return;
  }
  $empty.classList.add('hidden');
  $layout.classList.remove('hidden');

  // Prefill address
  const savedAddr = getAddress();
  if (savedAddr) {
    $name.value = savedAddr.name || user.name || '';
    $phone.value = savedAddr.phone || '';
    $addr1.value = savedAddr.address1 || '';
    $addr2.value = savedAddr.address2 || '';
    $city.value = savedAddr.city || '';
    $state.value = savedAddr.state || '';
    $zip.value = savedAddr.zip || '';
  } else {
    $name.value = user.name || '';
  }

  // Render items list + totals
  function renderSummary() {
    const coupon = getCoupon();
    const code = coupon?.code || '';
    const note = coupon?.note || '';
    const itemsTotal = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
    const discount = computeDiscount(itemsTotal, code);
    const shipping = computeShipping(itemsTotal - discount, totalQty(cart), hasFreeShippingCoupon(code));
    const grand = Math.max(0, itemsTotal - discount + shipping);

    // Items list
    $itemsList.innerHTML = cart.map(item => {
      const name = escapeHtml(item.name || 'Product');
      const img = item.image || '';
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      return `
        <div class="item">
          <img src="${img}" alt="${name}" loading="lazy" />
          <div>
            <div>${name}</div>
            <div class="meta">Qty: ${qty}</div>
          </div>
          <div><strong>${INR.format(price * qty)}</strong></div>
        </div>
      `;
    }).join('');

    // Totals
    $itemsTotal.textContent = INR.format(itemsTotal);
    $discountTotal.textContent = `- ${INR.format(discount)}`;
    $shippingTotal.textContent = INR.format(shipping);
    $grandTotal.textContent = INR.format(grand);
    $couponTag.textContent = code ? `(${code}${note ? ` • ${note}` : ''})` : '';

    // Enable place-order when form valid
    updatePlaceBtn();
  }

  function totalQty(c) { return c.reduce((n, i) => n + (Number(i.qty) || 0), 0); }

  // Totals logic (match cart.js)
  function computeDiscount(subtotal, code) {
    if (!code || subtotal <= 0) return 0;
    const up = String(code).trim().toUpperCase();
    if (up === 'SAVE10') return Math.min(Math.round(subtotal * 0.10), 1000);
    if (up === 'WELCOME100') return subtotal >= 500 ? 100 : 0;
    return 0;
  }
  function hasFreeShippingCoupon(code) {
    return String(code || '').trim().toUpperCase() === 'FREESHIP';
  }
  function computeShipping(subtotalAfterDiscount, itemCount, hasFreeShip) {
    if (itemCount === 0) return 0;
    if (hasFreeShip) return 0;
    return subtotalAfterDiscount >= 999 ? 0 : 49;
  }

  // Validation helpers
  function setFieldState(field, ok, msg = '') {
    const box = field.closest('.field');
    if (!box) return;
    box.classList.toggle('invalid', !ok);
    const hint = box.querySelector('.hint');
    if (hint) hint.textContent = msg;
  }

  function validName(v) { return v.trim().length >= 2; }
  function validPhone(v) { return /^[6-9]\d{9}$/.test(v.trim()); }         // simple 10-digit India mobile
  function validZip(v) { return /^\d{5,6}$/.test(v.trim()); }              // allow 5 or 6 digits
  function notEmpty(v) { return v.trim().length > 0; }

  // Card validation/formatting
  function formatCardNumber(v) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  }
  function luhnCheck(num) {
    const arr = num.split('').reverse().map(x => parseInt(x, 10));
    const sum = arr.reduce((acc, d, i) => acc + (i % 2 ? ((d *= 2) > 9 ? d - 9 : d) : d), 0);
    return sum % 10 === 0;
  }
  function validExpiry(v) {
    const m = /^(\d{2})\/(\d{2})$/.exec(v);
    if (!m) return false;
    const mm = +m[1], yy = +m[2];
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const y = now.getFullYear() % 100;
    const mth = now.getMonth() + 1;
    return yy > y || (yy === y && mm >= mth);
  }
  function validCvv(v) { return /^\d{3,4}$/.test(v); }
  function validUpi(v) { return /^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(v.trim()); }

  // Field listeners
  $name.addEventListener('input', () => setFieldState($name, validName($name.value), validName($name.value) ? '' : 'Enter full name'));
  $phone.addEventListener('input', () => setFieldState($phone, validPhone($phone.value), 'Enter a valid 10-digit mobile'));
  $addr1.addEventListener('input', () => setFieldState($addr1, notEmpty($addr1.value), 'Address is required'));
  $city.addEventListener('input', () => setFieldState($city, notEmpty($city.value), 'City is required'));
  $state.addEventListener('input', () => setFieldState($state, notEmpty($state.value), 'State is required'));
  $zip.addEventListener('input', () => setFieldState($zip, validZip($zip.value), 'Enter valid PIN/ZIP'));

  // Payment toggle
  function updatePaymentUI() {
    const method = getPaymentMethod();
    $cardBox.classList.toggle('hidden', method !== 'card');
    $upiBox.classList.toggle('hidden', method !== 'upi');
    updatePlaceBtn();
  }
  function getPaymentMethod() {
    const r = [...$radios].find(x => x.checked);
    return r ? r.value : 'cod';
  }
  $radios.forEach(r => r.addEventListener('change', updatePaymentUI));

  // Card field masks
  $cardNumber.addEventListener('input', () => {
    const f = formatCardNumber($cardNumber.value);
    if ($cardNumber.value !== f) $cardNumber.value = f;
    const raw = f.replace(/\s/g, '');
    const ok = raw.length === 16 && luhnCheck(raw);
    setFieldState($cardNumber, ok, ok ? '' : 'Enter a valid card number');
    updatePlaceBtn();
  });
  $cardName.addEventListener('input', () => {
    const ok = $cardName.value.trim().length >= 2;
    setFieldState($cardName, ok, ok ? '' : 'Name on card');
    updatePlaceBtn();
  });
  $cardExpiry.addEventListener('input', () => {
    let v = $cardExpiry.value.replace(/[^\d]/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    if ($cardExpiry.value !== v) $cardExpiry.value = v;
    const ok = validExpiry($cardExpiry.value);
    setFieldState($cardExpiry, ok, ok ? '' : 'MM/YY');
    updatePlaceBtn();
  });
  $cardCvv.addEventListener('input', () => {
    const v = $cardCvv.value.replace(/\D/g, '').slice(0, 4);
    if ($cardCvv.value !== v) $cardCvv.value = v;
    const ok = validCvv(v);
    setFieldState($cardCvv, ok, ok ? '' : '3–4 digits');
    updatePlaceBtn();
  });

  $upiId.addEventListener('input', () => {
    const ok = validUpi($upiId.value);
    setFieldState($upiId, ok, ok ? '' : 'example@bank');
    updatePlaceBtn();
  });

  // Enable/disable Place button
  function isAddressValid() {
    return (
      validName($name.value) &&
      validPhone($phone.value) &&
      notEmpty($addr1.value) &&
      notEmpty($city.value) &&
      notEmpty($state.value) &&
      validZip($zip.value)
    );
  }
  function isPaymentValid() {
    const m = getPaymentMethod();
    if (m === 'cod') return true;
    if (m === 'card') {
      const raw = $cardNumber.value.replace(/\s/g, '');
      return raw.length === 16 && luhnCheck(raw) &&
             $cardName.value.trim().length >= 2 &&
             validExpiry($cardExpiry.value) &&
             validCvv($cardCvv.value);
    }
    if (m === 'upi') return validUpi($upiId.value);
    return false;
  }
  function updatePlaceBtn() {
    $placeBtn.disabled = !(isAddressValid() && isPaymentValid() && cart.length > 0);
  }

  // Save address when toggled or on change
  [$name, $phone, $addr1, $addr2, $city, $state, $zip].forEach(el => {
    el.addEventListener('input', () => {
      updatePlaceBtn();
      if ($save.checked) {
        saveAddress(collectAddress());
      }
    });
  });

  function collectAddress() {
    return {
      name: $name.value.trim(),
      phone: $phone.value.trim(),
      address1: $addr1.value.trim(),
      address2: $addr2.value.trim(),
      city: $city.value.trim(),
      state: $state.value.trim(),
      zip: $zip.value.trim(),
    };
  }

  // Place order
  let placing = false;
  $placeBtn.addEventListener('click', async () => {
    if (placing) return;
    if (!isAddressValid()) {
      $status.textContent = 'Please correct the highlighted address fields.';
      window.MyShop?.showToast?.('Fix address fields');
      return;
    }
    if (!isPaymentValid()) {
      $status.textContent = 'Please complete valid payment details.';
      window.MyShop?.showToast?.('Fix payment details');
      return;
    }

    placing = true;
    $placeBtn.disabled = true;
    $placeBtn.textContent = 'Placing order...';

    try {
      const coupon = getCoupon();
      const itemsTotal = cart.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
      const discount = computeDiscount(itemsTotal, coupon?.code);
      const shipping = computeShipping(itemsTotal - discount, totalQty(cart), hasFreeShippingCoupon(coupon?.code));
      const grand = Math.max(0, itemsTotal - discount + shipping);

      const method = getPaymentMethod();
      const payment = {
        method,
        ...(method === 'card' ? {
          last4: $cardNumber.value.replace(/\D/g, '').slice(-4),
          name: $cardName.value.trim(),
          exp: $cardExpiry.value
        } : {}),
        ...(method === 'upi' ? { upi: $upiId.value.trim() } : {})
      };

      const orderId = `MS${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random()*1e4).toString().padStart(4,'0')}`;

      const order = {
        id: orderId,
        ts: Date.now(),
        user: { name: user.name },
        address: collectAddress(),
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image })),
        totals: { itemsTotal, discount, shipping, grand, currency: 'INR', coupon: coupon?.code || null },
        payment,
        notes: (document.getElementById('notes')?.value || '').trim(),
        status: 'PLACED'
      };

      // Persist
      const orders = loadOrders();
      orders.push(order);
      saveOrders(orders);
      localStorage.setItem(LAST_ORDER_KEY, orderId);

      // Clear cart + coupon
      saveCart([]);
      clearCoupon();
      window.MyShop?.updateCartCount?.();

      window.MyShop?.showToast?.('Order placed successfully 🎉');
      // Redirect
      setTimeout(() => {
        location.href = `order-confirmation.html?order=${encodeURIComponent(orderId)}`;
      }, 600);
    } catch (e) {
      console.error(e);
      window.MyShop?.showToast?.('Something went wrong. Please try again.');
      $status.textContent = 'Something went wrong. Please try again.';
      $placeBtn.disabled = false;
      $placeBtn.textContent = 'Place Order';
      placing = false;
      return;
    }
  });

  // Initial UI
  updatePaymentUI();
  renderSummary();
  updatePlaceBtn();

  // Helpers
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
});