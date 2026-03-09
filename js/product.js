// js/products.js
// Products page: render, search, filter, sort, add-to-cart (uses MyShop from main.js)
document.addEventListener('DOMContentLoaded', () => {
  const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  // Elements
  const $container = document.getElementById('productContainer');
  const $resultsInfo = document.getElementById('resultsInfo');
  const $search = document.getElementById('searchInput');
  const $clearSearch = document.getElementById('clearSearch');
  const $sort = document.getElementById('sortSelect');
  const $category = document.getElementById('categoryFilter');

  // Use external data if available (window.MyShopData.products), else demo set
  const products = (window.MyShopData?.products && Array.isArray(window.MyShopData.products) && window.MyShopData.products.length)
    ? window.MyShopData.products
    : [
        { id: 101, name: 'Wireless Headphones', price: 3499, category: 'Audio', rating: 4.6, popularity: 98, images: ['https://picsum.photos/seed/headphones-a/900/700'], description: 'Noise-reducing over-ear with 30h battery and fast charge.' },
        { id: 102, name: 'Smartwatch Pro',      price: 6999, category: 'Gadgets', rating: 4.4, popularity: 91, images: ['https://picsum.photos/seed/smartwatch-a/900/700'], description: 'Track health, messages, and workouts.' },
        { id: 103, name: 'Coffee Maker 12‑cup', price: 2799, category: 'Home',    rating: 4.2, popularity: 85, images: ['https://picsum.photos/seed/coffeemaker-a/900/700'], description: 'Programmable brewer with auto shutoff.' },
        { id: 104, name: 'Bluetooth Speaker Mini', price: 1999, category: 'Audio', rating: 4.3, popularity: 89, images: ['https://picsum.photos/seed/speaker-a/900/700'], description: 'Pocket-sized, big sound, IPX7 waterproof.' },
        { id: 105, name: 'Ergonomic Laptop Stand', price: 1299, category: 'Office', rating: 4.5, popularity: 84, images: ['https://picsum.photos/seed/stand-a/900/700'], description: 'Aluminum, foldable, height-adjustable.' },
        { id: 106, name: 'Action Camera 4K',       price: 12999, category: 'Photography', rating: 4.7, popularity: 93, images: ['https://picsum.photos/seed/actioncam-a/900/700'], description: 'Stabilized 4K60 video, waterproof case.' },
        { id: 107, name: 'LED Desk Lamp',          price: 899, category: 'Home', rating: 4.1, popularity: 76, images: ['https://picsum.photos/seed/lamps-a/900/700'], description: 'Dimmable with USB charging port.' },
        { id: 108, name: 'Premium Yoga Mat',       price: 1499, category: 'Fitness', rating: 4.4, popularity: 79, images: ['https://picsum.photos/seed/yogamat-a/900/700'], description: 'Non-slip, 6mm cushioning.' },
      ];

  // Build category options
  const categories = Array.from(new Set(products.map(p => p.category))).sort();
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    $category?.appendChild(opt);
  });

  // State from URL (optional pre-filter)
  const params = new URLSearchParams(location.search);
  let state = {
    search: params.get('q') || params.get('search') || '',
    sort: params.get('sort') || 'popularity',
    category: params.get('category') || 'all',
  };

  // Helpers
  function stars(r) {
    const n = Math.round(r || 0);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Render
  function renderProducts(list) {
    if (!$container) return;
    if (!list.length) {
      $container.innerHTML = `
        <div class="product-card" style="padding: 20px; text-align:center">
          <p>No products found. Try clearing filters or searching something else.</p>
        </div>
      `;
      return;
    }
    $container.innerHTML = list.map(p => `
      <article class="product-card">
        <img class="thumb" src="${p.images?.[0] || p.image || ''}" alt="${escapeHtml(p.name)}" loading="lazy" />
        <div class="product-body">
          <h3 class="product-title">${escapeHtml(p.name)}</h3>
          <div class="product-meta">
            <span class="price">${INR.format(p.price)}</span>
            <span class="rating" aria-label="Rating ${p.rating} out of 5">${stars(p.rating)}</span>
          </div>
          <p class="product-desc">${escapeHtml(p.description || '')}</p>
          <div class="product-meta">
            <span class="badge">${escapeHtml(p.category)}</span>
            <span style="color:#94a3b8; font-size:.85rem;">Pop • ${p.popularity || 0}</span>
          </div>
          <div class="product-actions" style="display:flex; gap:8px; margin-top:6px;">
            <button class="btn btn-primary" data-role="add" data-id="${p.id}">Add to cart</button>
            <button class="btn btn-ghost" data-role="view" data-id="${p.id}">View</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  function updateResultsInfo(total, filtered) {
    if ($resultsInfo) $resultsInfo.textContent = filtered === total ? `${filtered} products` : `${filtered} of ${total} products`;
  }

  // Filter + sort
  function applyFilters() {
    const total = products.length;
    let list = products.slice();

    // Category
    if (state.category !== 'all') {
      list = list.filter(p => String(p.category).toLowerCase() === String(state.category).toLowerCase());
    }

    // Search
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    // Sort
    switch (state.sort) {
      case 'price-asc':   list.sort((a, b) => a.price - b.price); break;
      case 'price-desc':  list.sort((a, b) => b.price - a.price); break;
      case 'rating-desc': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'name-asc':    list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'popularity':
      default:            list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    renderProducts(list);
    updateResultsInfo(total, list.length);
  }

  // Events
  $search?.addEventListener('input', (e) => {
    state.search = e.target.value;
    applyFilters();
  });

  $clearSearch?.addEventListener('click', () => {
    if ($search && $search.value) {
      $search.value = '';
      state.search = '';
      $search.focus();
      applyFilters();
    }
  });

  $sort?.addEventListener('change', (e) => {
    state.sort = e.target.value;
    applyFilters();
  });

  $category?.addEventListener('change', (e) => {
    state.category = e.target.value;
    applyFilters();
  });

  // Delegated actions
  $container?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-role]');
    if (!btn) return;
    const id = Number(btn.getAttribute('data-id'));
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (btn.dataset.role === 'add') {
      window.MyShop?.addToCart(product, 1);
    } else if (btn.dataset.role === 'view') {
      location.href = `product-details.html?id=${id}`;
    }
  });

  // Initial UI
  if ($search && state.search) $search.value = state.search;
  if ($sort) $sort.value = state.sort;
  if ($category && categories.includes(state.category)) $category.value = state.category;

  applyFilters();
  window.MyShop?.updateCartCount?.();
});