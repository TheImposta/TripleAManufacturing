import { supabase } from './supabase.js';

const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('auth-error');

// --- 1. AUTHENTICATION & SECURITY ---

function isUserAdmin(user) {
  if (!user) return false;

  return Boolean(
    (user.user_metadata && user.user_metadata.is_admin === true) ||
    (user.user_meta_data && user.user_meta_data.is_admin === true) ||
    (user.raw_app_meta_data && user.raw_app_meta_data.is_admin === true) ||
    (user.raw_user_meta_data && user.raw_user_meta_data.is_admin === true) ||
    (user.app_metadata && user.app_metadata.is_admin === true) ||
    (user.email && user.email.includes('admin'))
  );
}

async function checkAdmin() {
  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser()
  ]);

  const session = sessionData?.session;
  const user = userData?.user;

  if (session && user) {
    const isAdmin = isUserAdmin(user);

    if (isAdmin) {
      loginSection.style.display = 'none';
      adminSection.style.display = 'block';
      await loadDashboard();
    } else {
      authError.innerText = "Access denied. Admin credentials required.";
      setTimeout(async () => await supabase.auth.signOut(), 1500);
    }
  } else {
    loginSection.style.display = 'block';
    adminSection.style.display = 'none';
  }
}

// --- 2. LOGIN / LOGOUT ---

if (loginBtn) {
  loginBtn.onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
      authError.innerText = "Please enter credentials.";
      return;
    }

    loginBtn.innerText = "Signing in...";
    loginBtn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      authError.innerText = error.message;
      loginBtn.innerText = "Sign In";
      loginBtn.disabled = false;
    } else {
      setTimeout(checkAdmin, 400);
    }
  };
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };
}

// --- 3. DASHBOARD LOADING ---

async function loadDashboard() {
  await Promise.all([loadProducts(), loadOrders()]);
}

// Load all products for admin inventory panel
async function loadProducts() {
  const container = document.getElementById('admin-product-list');
  if (!container) return;

  container.innerHTML = '<p>Loading inventory...</p>';

  // Some schemas don't have created_at — order by id to avoid errors
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    container.innerHTML = `<p>Error loading products: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No products found.</p>';
    return;
  }

  container.innerHTML = data.map(p => {
    const qty = (typeof p.quantity === 'number') ? p.quantity : null;
    const outOfStock = qty !== null && qty <= 0;
    return `
      <div class="product-card" style="padding:16px; position:relative; ${outOfStock ? 'opacity:0.6;' : ''}">
        <h4>${p.name}</h4>
        <p style="color:var(--gray); margin-top:6px;">${p.size || ''} · ${p.color || ''} · ${p.thickness_microns || ''}μ</p>
        <p style="margin-top:12px; font-weight:700;">$${p.price_per_1000 || '—'} / 1k units</p>

        <p style="margin-top:10px;">Quantity: <strong id="qty-display-${p.id}">${qty === null ? '—' : qty}</strong></p>

        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
          <input id="qty-input-${p.id}" type="number" value="${qty === null ? 0 : qty}" style="width:110px; padding:8px; border-radius:8px; border:1px solid #d2d2d7;">
          <button onclick="updateProductQuantity('${p.id}')">Save</button>
          <button onclick="deleteProduct('${p.id}')">Delete</button>
        </div>

        ${outOfStock ? `<div id="oos-${p.id}" style="margin-top:12px; font-weight:800; color:#333;">Out of Stock, will be available soon</div>` : ''}
      </div>
    `;
  }).join('');
}

// Load orders and include buyer contact info (customer_email)
async function loadOrders() {
  const container = document.getElementById('orders-list');
  if (!container) return;

  container.innerHTML = '<p>Loading orders...</p>';

  const [{ data: orders, error: ordersErr }, { data: products, error: prodErr }] = await Promise.all([
    supabase.from('orders').select('*').order('id', { ascending: false }),
    supabase.from('products').select('*')
  ]);

  if (ordersErr) {
    container.innerHTML = `<p>Error loading orders: ${ordersErr.message}</p>`;
    return;
  }

  if (prodErr) {
    console.warn('Failed to load products for orders mapping', prodErr);
  }

  const prodMap = new Map((products || []).map(p => [p.id, p]));

  if (!orders || orders.length === 0) {
    container.innerHTML = '<p>No orders found.</p>';
    return;
  }

  container.innerHTML = orders.map(o => {
    const product = prodMap.get(o.product_id);
    const name = product ? product.name : `Product ID: ${o.product_id}`;
    const buyerEmail = o.customer_email || o.customer_email_address || '';
    const buyerPhone = o.customer_phone || '';

    const contactBuyerButtons = buyerEmail || buyerPhone ? `
      <div style="margin-top:8px; display:flex; gap:8px;">
        ${buyerEmail ? `<a href="mailto:${buyerEmail}?subject=Order%20${o.id}%20Pickup%20and%20Payment" style="text-decoration:none;"><button>Email Buyer</button></a>` : ''}
        ${buyerPhone ? `<a href="tel:${buyerPhone}" style="text-decoration:none;"><button>Call Buyer</button></a>` : ''}
      </div>
    ` : `<p style="margin-top:8px; color:var(--gray);">No buyer contact on record</p>`;

    return `
      <div style="padding:12px; border-bottom:1px solid rgba(0,0,0,0.04);">
        <h4 style="margin-bottom:6px;">${name}</h4>
        <p style="color:var(--gray); margin-bottom:6px;">Quantity: <strong>${o.quantity}</strong> · Status: <strong>${o.status || 'PENDING'}</strong></p>
        <p style="font-size:13px; color:#666;">User ID: ${o.user_id} · Order ID: ${o.id}</p>
        ${contactBuyerButtons}
      </div>
    `;
  }).join('');
}

// --- 4. ADD PRODUCT HANDLER ---

const addProdBtn = document.getElementById('addProdBtn');
if (addProdBtn) {
  addProdBtn.onclick = async (e) => {
    e.preventDefault();

    const name = (document.getElementById('p-name')?.value || '').trim();
    const size = (document.getElementById('p-size')?.value || '').trim();
    const color = (document.getElementById('p-color')?.value || '').trim();
    const thickness = parseInt(document.getElementById('p-thickness')?.value || '0', 10);
    const price = parseFloat(document.getElementById('p-price')?.value || '0');
    const quantity = parseInt(document.getElementById('p-quantity')?.value || '0', 10);

    if (!name || !price) {
      alert("Name and price are required.");
      return;
    }

    addProdBtn.innerText = "Adding...";
    addProdBtn.disabled = true;

    const payload = {
      name,
      size,
      color,
      thickness_microns: isNaN(thickness) ? null : thickness,
      price_per_1000: isNaN(price) ? null : price
    };

    // include quantity if the schema supports it
    if (!isNaN(quantity)) payload.quantity = quantity;

    const { data, error } = await supabase.from('products').insert([payload]);

    if (error) {
      alert("Failed to add product: " + error.message);
      addProdBtn.innerText = "Add Product";
      addProdBtn.disabled = false;
      return;
    }

    await loadProducts();
    await loadOrders();

    ['p-name', 'p-size', 'p-color', 'p-thickness', 'p-price', 'p-quantity'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    addProdBtn.innerText = "Add Product";
    addProdBtn.disabled = false;
  };
}

// Expose helpers for inline buttons
window.deleteProduct = async (id) => {
  if (!id) return;
  if (!confirm('Are you sure you want to delete this product?')) return;

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    alert("Delete failed: " + error.message);
  } else {
    await loadProducts();
    await loadOrders();
  }
};

window.updateProductQuantity = async (id) => {
  const el = document.getElementById(`qty-input-${id}`);
  if (!el) return alert('Quantity input not found.');

  const newQty = parseInt(el.value || '0', 10);
  if (isNaN(newQty)) return alert('Invalid quantity.');

  const { error } = await supabase.from('products').update({ quantity: newQty }).eq('id', id);
  if (error) {
    alert('Failed to update quantity: ' + error.message);
    return;
  }

  const display = document.getElementById(`qty-display-${id}`);
  if (display) display.innerText = newQty;

  // update out of stock UI
  const oos = document.getElementById(`oos-${id}`);
  if (newQty <= 0) {
    if (!oos) {
      // reload products to show message reliably
      await loadProducts();
    }
  } else {
    if (oos) oos.remove();
    // ensure card opacity reset
    await loadProducts();
  }
};

// Start the admin check on load
checkAdmin();
