// Home page: render featured products, search filter, actions
document.addEventListener('DOMContentLoaded', () => {
  const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  const $container = document.getElementById('featuredContainer');
  const $search = document.getElementById('homeSearch');
  const $clear = document.getElementById('homeSearchClear');

  const products = (window.MyShopData?.products || []).slice(0, 12); // featured

  let state = { query: '' };

  function stars(r) {
    const n = Math.round(r || 0);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
    }

  function render(list) {
    if (!$container) return;
    if (!list.length) {
      $container.innerHTML = `<p class="muted">No products match your search.</p>`;
      return;
    }
    $container.innerHTML = list.map(p => `
      <article class="product-card">
        <img src="${p.images?.[0] || ''}" alt="${p.name}" loading="lazy" />
        <h4 class="card-title">${p.name}</h4>
        <div class="card-meta">
          <span class="price">${INR.format(p.price)}</span>
          <span class="rating" aria-label="Rating ${p.rating} out of 5">${stars(p.rating)}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-primary" data-role="add" data-id="${p.id}">Add to cart</button>
          <button class="btn btn-ghost" data-role="view" data-id="${p.id}">View</button>
        </div>
      </article>
    `).join('');
  }

  function applyFilter() {
    const q = state.query.trim().toLowerCase();
    const list = q
      ? products.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        )
      : products.slice();
    render(list);
  }

  // Events
  $search?.addEventListener('input', (e) => {
    state.query = e.target.value;
    applyFilter();
  });

  $clear?.addEventListener('click', () => {
    if ($search.value) {
      $search.value = '';
      state.query = '';
      $search.focus();
      applyFilter();
    }
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

  // Initial render
  applyFilter();
});