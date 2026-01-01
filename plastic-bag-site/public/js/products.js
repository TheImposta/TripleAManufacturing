// public/js/products.js
import { supabase } from './supabase.js';

// Product list rendering with proper event handlers (no inline onclicks)
const container = document.getElementById('product-list');

function createProductCard(p) {
  const qty = (typeof p.quantity === 'number') ? p.quantity : null;
  const outOfStock = qty !== null && qty <= 0;

  const card = document.createElement('div');
  card.className = 'product-card';
  card.style.position = 'relative';

  const title = document.createElement('h3');
  title.innerText = p.name || 'Product';
  card.appendChild(title);

  const meta = document.createElement('p');
  meta.style.color = 'var(--gray)';
  meta.innerText = `${p.size || ''} · ${p.color || ''}`;
  card.appendChild(meta);

  const thickness = document.createElement('p');
  thickness.style.marginTop = '8px';
  thickness.innerText = `${p.thickness_microns || ''} microns thickness`;
  card.appendChild(thickness);

  const price = document.createElement('p');
  price.style.marginTop = '12px';
  price.style.fontWeight = '700';
  price.innerText = `$${p.price_per_1000 || '—'} / 1k units`;
  card.appendChild(price);

  const qtyRow = document.createElement('div');
  qtyRow.style.marginTop = '12px';
  qtyRow.innerHTML = `
    <label style="font-size:14px; font-weight:600;">Quantity (units)</label>
  `;
  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.min = '1';
  qtyInput.value = p.default_order_quantity || 1000;
  qtyInput.id = `qty-${p.id}`;
  qtyInput.style.marginLeft = '8px';
  qtyRow.appendChild(qtyInput);
  card.appendChild(qtyRow);

  const actions = document.createElement('div');
  actions.style.marginTop = '12px';
  const orderBtn = document.createElement('button');
  orderBtn.innerText = outOfStock ? 'Out of Stock' : 'Order Now';
  orderBtn.disabled = !!outOfStock;
  orderBtn.addEventListener('click', () => {
    // dynamic import to reuse existing module
    import('./order.js').then(mod => {
      mod.initiateOrder(p.id, p.name, p.price_per_1000 || 0);
    });
  });
  actions.appendChild(orderBtn);
  card.appendChild(actions);

  if (outOfStock) {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.padding = '12px';
    overlay.style.fontWeight = '800';
    overlay.style.color = '#333';
    overlay.style.background = 'transparent';
    overlay.innerText = 'Out of Stock, will be available soon';
    card.appendChild(overlay);
    card.style.opacity = '0.6';
  }

  return card;
}

export async function loadProducts() {
  if (!container) return;
  container.innerHTML = '<p>Loading catalog...</p>';

  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = `<p>Error loading catalog: ${error.message}</p>`;
    return;
  }

  container.innerHTML = '';
  if (!data || data.length === 0) {
    container.innerHTML = '<p>No products available.</p>';
    return;
  }

  data.forEach(p => {
    const card = createProductCard(p);
    container.appendChild(card);
  });
}

// load on module import
loadProducts();

// export default for other modules if needed
export default loadProducts;
