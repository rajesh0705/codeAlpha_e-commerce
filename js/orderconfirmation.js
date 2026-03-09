// js/order-confirmation.js
// Read order by ?order=ID (or last saved), render details, actions: share, print, track, buy again, reorder all, download receipt.
document.addEventListener('DOMContentLoaded', () => {
  const ORDERS_KEY = 'myshop_orders';
  const LAST_ORDER_KEY = 'myshop_last_order_id';
  const CART_KEY = 'myshop_cart';
  const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  // Elements (guard to avoid runtime errors)
  const $card = document.getElementById('confirmCard');
  const $empty = document.getElementById('notFound');

  const $orderId = document.getElementById('orderId');
  const $orderDate = document.getElementById('orderDate');
  const $payment = document.getElementById('paymentMethod');
  const $amount = document.getElementById('orderAmount');
  const $eta = document.getElementById('deliveryEta');

  const $itemsList = document.getElementById('itemsList');
  const $shipTo = document.getElementById('shipTo');

  const $itemsTotal = document.getElementById('itemsTotal');
  const $discountTotal = document.getElementById('discountTotal');
  const $shippingTotal = document.getElementById('shippingTotal');
  const $grandTotal = document.getElementById('grandTotal');

  const $btnContinue = document.getElementById('btnContinue');
  const $btnPrint = document.getElementById('btnPrint');
  const $btnShare = document.getElementById('btnShare');
  const $btnTrack = document.getElementById('btnTrack');
  const $copyId = document.getElementById('copyIdBtn');
  const $trackPanel = document.getElementById('trackPanel');
  const $trackSteps = document.getElementById('trackSteps');

  const $asideActions = document.querySelector('.right .actions'); // actions area in the summary aside

  // Fallback helpers if MyShop is not present
  const parse = (s, f) => { try { return JSON.parse(s) ?? f; } catch { return f; } };
  const getCart = () => parse(localStorage.getItem(CART_KEY), []);
  const saveCart = (c) => localStorage.setItem(CART_KEY, JSON.stringify(c));
  const updateCartCountLocal = () => {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = String(getCart().reduce((n, i) => n + (i.qty || 0), 0));
  };
  function addToCart(product, qty = 1) {
    if (window.MyShop?.addToCart) return window.MyShop.addToCart(product, qty);
    if (!product?.id) return;
    const cart = getCart();
    const addQty = Math.max(1, Number(qty) || 1);
    const found = cart.find(i => i.id === product.id);
    if (found) found.qty += addQty;
    else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: addQty });
    saveCart(cart);
    updateCartCountLocal();
    showToast('Added to cart 🛒');
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

  // Load order
  const orders = parse(localStorage.getItem(ORDERS_KEY), []);
  const params = new URLSearchParams(location.search);
  const orderParam = params.get('order');
  const lastId = localStorage.getItem(LAST_ORDER_KEY);
  const resolvedId = orderParam || lastId;
  const order = orders.find(o => String(o.id) === String(resolvedId));

  // Not found -> empty state
  if (!$card || !$empty || !order) {
    $empty?.classList.remove('hidden');
    $card?.classList.add('hidden');
    return;
  }

  // Meta
  document.title = `Order ${order.id} • MyShop`;
  $orderId.textContent = order.id;
  $orderDate.textContent = formatDate(order.ts || Date.now());
  $payment.textContent = formatPayment(order.payment);
  $amount.textContent = INR.format(order?.totals?.grand ?? sumGrand(order));
  $eta.textContent = estimateDeliveryRange(order.ts);

  // Address
  const a = order.address || {};
  $shipTo.textContent =
`${a.name || ''}
${a.address1 || ''}${a.address2 ? ', ' + a.address2 : ''}
${[a.city, a.state, a.zip].filter(Boolean).join(', ')}
${a.phone ? 'Phone: ' + a.phone : ''}`.trim();

  // Items
  const items = Array.isArray(order.items) ? order.items : [];
  $itemsList.innerHTML = items.map(it => {
    const name = escapeHtml(it.name || 'Product');
    const img = it.image || '';
    const qty = Number(it.qty) || 1;
    const price = Number(it.price) || 0;
    const idAttr = it.id != null ? `data-id="${it.id}"` : '';
    return `
      <div class="item" ${idAttr}>
        <img src="${img}" alt="${name}" loading="lazy" />
        <div>
          <div class="title">${name}</div>
          <div class="meta">Qty: ${qty}</div>
          <div class="actions">
            <button class="btn btn-ghost buy-again" ${idAttr}>Buy again</button>
          </div>
        </div>
        <div class="right"><strong>${INR.format(price * qty)}</strong></div>
      </div>
    `;
  }).join('');

  // Totals
  const itemsTotal = order?.totals?.itemsTotal ?? items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const discount = order?.totals?.discount ?? 0;
  const shipping = order?.totals?.shipping ?? 0;
  const grand = order?.totals?.grand ?? Math.max(0, itemsTotal - discount + shipping);

  $itemsTotal.textContent = INR.format(itemsTotal);
  $discountTotal.textContent = `- ${INR.format(discount)}`;
  $shippingTotal.textContent = INR.format(shipping);
  $grandTotal.textContent = INR.format(grand);

  // Show card
  $empty.classList.add('hidden');
  $card.classList.remove('hidden');

  // Actions
  $btnContinue?.addEventListener('click', () => (location.href = 'products.html'));
  $btnPrint?.addEventListener('click', () => window.print());
  $btnShare?.addEventListener('click', async () => {
    const url = new URL(location.href);
    url.searchParams.set('order', order.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Order ${order.id} • MyShop`, text: 'MyShop order confirmation', url: url.toString() });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString());
        showToast('Link copied to clipboard 🔗');
      } else {
        alert(url.toString());
      }
    } catch {}
  });
  $btnTrack?.addEventListener('click', () => {
    $trackPanel?.classList.toggle('hidden');
    const elapsedHrs = Math.max(0, (Date.now() - (order.ts || Date.now())) / 36e5);
    const step = elapsedHrs > 96 ? 5 : elapsedHrs > 48 ? 4 : elapsedHrs > 24 ? 3 : elapsedHrs > 6 ? 2 : 1;
    if ($trackSteps) [...$trackSteps.children].forEach((li, i) => li.classList.toggle('done', i < step));
  });
  $copyId?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      showToast('Order ID copied');
    } catch {
      showToast(order.id);
    }
  });

  // Extra: add "Reorder all" and "Download receipt" buttons dynamically
  if ($asideActions) {
    const btnReorder = document.createElement('button');
    btnReorder.className = 'btn btn-ghost';
    btnReorder.id = 'btnReorderAll';
    btnReorder.textContent = 'Reorder all';
    $asideActions.appendChild(btnReorder);

    const btnDownload = document.createElement('button');
    btnDownload.className = 'btn btn-ghost';
    btnDownload.id = 'btnDownload';
    btnDownload.textContent = 'Download receipt';
    $asideActions.appendChild(btnDownload);

    btnReorder.addEventListener('click', () => {
      let added = 0;
      items.forEach(it => {
        if (!it?.id) return;
        addToCart({ id: it.id, name: it.name, price: it.price, image: it.image }, it.qty || 1);
        added += it.qty || 1;
      });
      if (added) showToast(`Added ${added} item(s) from this order`);
    });

    btnDownload.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  // Click item image/title to view details (if ID present)
  $itemsList?.addEventListener('click', (e) => {
    const img = e.target.closest('img');
    const title = e.target.closest('.title');
    const row = e.target.closest('.item');
    if (!row) return;
    const pid = row.getAttribute('data-id');
    if (!pid) return;
    if (img || title) {
      location.href = `product-details.html?id=${encodeURIComponent(pid)}`;
    }
  });

  // Buy again (delegated)
  $itemsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.buy-again');
    if (!btn) return;
    const pid = btn.getAttribute('data-id') || btn.closest('.item')?.getAttribute('data-id');
    const orig = items.find(x => String(x.id) === String(pid));
    if (!orig) return;
    addToCart({ id: orig.id, name: orig.name, price: orig.price, image: orig.image }, 1);
  });

  // Copy address on click
  $shipTo?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($shipTo.textContent.trim());
      showToast('Address copied 📋');
    } catch {}
  });

  // Helpers
  function sumGrand(o) {
    const its = o?.items || [];
    const itemsTotal = its.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
    const discount = o?.totals?.discount || 0;
    const shipping = o?.totals?.shipping || 0;
    return Math.max(0, itemsTotal - discount + shipping);
  }
  function formatPayment(p) {
    if (!p || !p.method) return '—';
    if (p.method === 'cod') return 'Cash on Delivery';
    if (p.method === 'card') return `Card •••• ${p.last4 || ''}`;
    if (p.method === 'upi') return `UPI ${p.upi || ''}`;
    return p.method;
  }
  function estimateDeliveryRange(ts) {
    const base = new Date(ts || Date.now());
    const min = addDays(base, 3);
    const max = addDays(base, 6);
    return `${fmtShort(min)} – ${fmtShort(max)}`;
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function fmtShort(d) { return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
  function formatDate(ts) {
    return new Date(ts).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
});