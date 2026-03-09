// Product Details page logic
document.addEventListener('DOMContentLoaded', () => {
  const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  // Elements
  const $mainImage = document.getElementById('mainImage');
  const $thumbs = document.getElementById('thumbs');
  const $name = document.getElementById('productName');
  const $category = document.getElementById('productCategory');
  const $price = document.getElementById('productPrice');
  const $desc = document.getElementById('productDesc');
  const $ratingStars = document.getElementById('ratingStars');
  const $ratingValue = document.getElementById('ratingValue');
  const $stock = document.getElementById('stockStatus');
  const $featureList = document.getElementById('featureList');
  const $qty = document.getElementById('qtyInput');
  const $btnMinus = document.getElementById('btnMinus');
  const $btnPlus = document.getElementById('btnPlus');
  const $btnAdd = document.getElementById('btnAdd');
  const $btnBuy = document.getElementById('btnBuy');
  const $btnShare = document.getElementById('btnShare');
  const $related = document.getElementById('relatedContainer');
  const $crumbCat = document.getElementById('crumbCategory');
  const $crumbName = document.getElementById('crumbName');

  // Load product by id from query
  const params = new URLSearchParams(location.search);
  const idParam = Number(params.get('id'));
  const all = window.MyShopData?.products || [];
  let product = all.find(p => p.id === idParam) || all[0];

  if (!product) {
    // No data present
    document.querySelector('.product-details').innerHTML = '<p>Product not found.</p>';
    return;
  }

  // Fill UI
  document.title = `${product.name} • MyShop`;

  $name.textContent = product.name;
  $category.textContent = product.category;
  $crumbCat.textContent = product.category;
  $crumbCat.href = `products.html?category=${encodeURIComponent(product.category)}`;
  $crumbName.textContent = product.name;

  $price.textContent = INR.format(product.price);
  $desc.textContent = product.description || '';

  const r = Math.round(product.rating || 0);
  $ratingStars.textContent = '★'.repeat(r) + '☆'.repeat(5 - r);
  $ratingValue.textContent = `(${(product.rating || 0).toFixed(1)})`;

  const inStock = (product.stock ?? 0) > 0;
  $stock.textContent = inStock ? 'In stock' : 'Out of stock';
  $stock.style.color = inStock ? '#16a34a' : '#b91c1c';

  // Features
  $featureList.innerHTML = (product.features || [])
    .map(f => `<li>${f}</li>`)
    .join('');

  // Gallery
  const images = product.images?.length ? product.images : [product.image].filter(Boolean);
  function setMain(src, thumbBtn) {
    $mainImage.src = src;
    $mainImage.alt = product.name;
    [...$thumbs.children].forEach(el => el.classList.remove('active'));
    if (thumbBtn) thumbBtn.classList.add('active');
  }
  $thumbs.innerHTML = '';
  images.forEach((src, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb' + (idx === 0 ? ' active' : '');
    btn.setAttribute('aria-label', `Image ${idx + 1}`);
    btn.innerHTML = `<img src="${src}" alt="${product.name} - view ${idx + 1}" loading="lazy" />`;
    btn.addEventListener('click', () => setMain(src, btn));
    $thumbs.appendChild(btn);
  });
  setMain(images[0], $thumbs.firstElementChild);

  // Quantity stepper
  const MIN = Number($qty.min) || 1;
  const MAX = Number($qty.max) || 10;
  function clampQty(v) {
    const n = Math.max(MIN, Math.min(MAX, Number(v) || MIN));
    $qty.value = n;
    return n;
  }
  $btnMinus.addEventListener('click', () => clampQty(Number($qty.value) - 1));
  $btnPlus.addEventListener('click', () => clampQty(Number($qty.value) + 1));
  $qty.addEventListener('input', () => clampQty($qty.value));

  // Actions
  $btnAdd.addEventListener('click', () => {
    if ((product.stock ?? 0) < 1) return window.MyShop?.showToast('Out of stock');
    const q = clampQty($qty.value);
    window.MyShop?.addToCart(product, q);
  });

  $btnBuy.addEventListener('click', () => {
    if ((product.stock ?? 0) < 1) return window.MyShop?.showToast('Out of stock');
    const q = clampQty($qty.value);
    window.MyShop?.addToCart(product, q);
    // Redirect to cart/checkout
    setTimeout(() => (location.href = 'cart.html'), 250);
  });

  $btnShare.addEventListener('click', async () => {
    const url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        window.MyShop?.showToast('Link copied to clipboard 🔗');
      } else {
        window.MyShop?.showToast(url);
      }
    } catch {}
  });

  // Related products (same category)
  const related = all.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  renderRelated(related);

  function renderRelated(list) {
    if (!$related) return;
    if (!list.length) {
      $related.innerHTML = `<p class="muted">No related products found.</p>`;
      return;
    }
    $related.innerHTML = list.map(p => `
      <article class="product-card">
        <img class="thumb" src="${p.images?.[0] || ''}" alt="${p.name}" loading="lazy" />
        <div class="product-body">
          <h4 class="product-title">${p.name}</h4>
          <div class="product-meta">
            <span class="price">${INR.format(p.price)}</span>
            <span class="rating">${'★'.repeat(Math.round(p.rating || 0))}${'☆'.repeat(5 - Math.round(p.rating || 0))}</span>
          </div>
          <div class="product-actions" style="display:flex; gap:8px; margin-top:6px;">
            <button class="btn btn-primary" data-role="view" data-id="${p.id}">View</button>
            <button class="btn btn-ghost" data-role="add" data-id="${p.id}">Add</button>
          </div>
        </div>
      </article>
    `).join('');

    // Delegated events for related actions
    $related.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-role]');
      if (!btn) return;
      const pid = Number(btn.getAttribute('data-id'));
      const prod = all.find(x => x.id === pid);
      if (!prod) return;

      if (btn.dataset.role === 'view') {
        location.href = `product-details.html?id=${pid}`;
      } else if (btn.dataset.role === 'add') {
        window.MyShop?.addToCart(prod, 1);
      }
    }, { once: true });
  }
});