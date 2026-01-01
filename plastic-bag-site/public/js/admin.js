// public/js/admin.js
import { supabase } from './supabase.js';

const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('auth-error');

const newOrdersBadge = document.getElementById('new-orders-badge');
const markNotifiedBtn = document.getElementById('mark-notified-btn');

// --- helpers ---
function isUserAdmin(user) {
  if (!user) return false;
  // check profiles table for is_admin flag
  return Boolean(user.email && user.email.includes('admin'));
}

async function checkAdmin() {
  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser()
  ]);

  const session = sessionData?.session;
  const user = userData?.user;

  if (session && user) {
    // get profile row
    const { data: profiles } = await supabase.from('profiles').select('*').eq('user_id', user.id).limit(1);
    const profile = profiles && profiles[0];

    const isAdminFlag = profile?.is_admin === true || isUserAdmin(user);

    if (isAdminFlag) {
      loginSection.style.display = 'none';
      adminSection.style.display = 'block';
      // populate admin contact form if profile exists
      if (profile) {
        document.getElementById('admin-display-name').value = profile.display_name || profile.full_name || '';
        document.getElementById('admin-contact-email').value = profile.contact_email || profile.email || '';
        document.getElementById('admin-contact-phone').value = profile.contact_phone || profile.phone || '';
      }
      await loadDashboard();
      await refreshNewOrdersCount();
    } else {
      authError.innerText = "Access denied. Admin credentials required.";
      setTimeout(async () => await supabase.auth.signOut(), 1500);
    }
  } else {
    loginSection.style.display = 'block';
    adminSection.style.display = 'none';
  }
}

// --- Login / Logout ---
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
      setTimeout(checkAdmin, 500);
    }
  };
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };
}

// --- Dashboard ---
async function loadDashboard() {
  await Promise.all([loadProducts(), loadOrders()]);
}

async function loadProducts() {
  const container = document.getElementById('admin-product-list');
  if (!container) return;

  container.innerHTML = '<p>Loading inventory...</p>';

  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });

  if (error) {
    container.innerHTML = `<p>Error loading products: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No products found.</p>';
    return;
  }

  container.innerHTML = '';
  data.forEach(p => {
    const qty = (typeof p.quantity === 'number') ? p.quantity : null;
    const outOfStock = qty !== null && qty <= 0;

    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <h3>${p.name}</h3>
      <p style="color:var(--gray);">${p.size || ''} · ${p.color || ''} · ${p.thickness_microns || ''}μ</p>
      <p style="font-weight:700; margin-top:8px;">$${p.price_per_1000 || '—'} / 1k units</p>
      <p style="margin-top:12px;">Quantity: <strong id="qty-display-${p.id}">${qty === null ? '—' : qty}</strong></p>
    `;

    const controls = document.createElement('div');
    controls.style.marginTop = '8px';
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    controls.style.alignItems = 'center';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.id = `qty-input-${p.id}`;
    qtyInput.value = qty === null ? 0 : qty;
    qtyInput.style.width = '110px';
    qtyInput.style.padding = '8px';
    controls.appendChild(qtyInput);

    const saveBtn = document.createElement('button');
    saveBtn.innerText = 'Save';
    saveBtn.onclick = () => updateProductQuantity(p.id);
    controls.appendChild(saveBtn);

    const delBtn = document.createElement('button');
    delBtn.style.background = '#ff3b30';
    delBtn.innerText = 'Delete';
    delBtn.onclick = () => deleteProduct(p.id);
    controls.appendChild(delBtn);

    card.appendChild(controls);

    if (outOfStock) {
      const oos = document.createElement('div');
      oos.className = 'out-of-stock';
      oos.id = `oos-${p.id}`;
      oos.innerText = 'Out of Stock, will be available soon';
      card.appendChild(oos);
      card.style.opacity = '0.6';
    }

    container.appendChild(card);
  });
}

async function loadOrders() {
  const container = document.getElementById('orders-list');
  if (!container) return;

  container.innerHTML = '<p>Loading orders...</p>';

  // fetch orders and products
  const [{ data: orders, error: ordersErr }, { data: products }] = await Promise.all([
    supabase.from('orders').select('*').order('id', { ascending: false }),
    supabase.from('products').select('*')
  ]);

  if (ordersErr) {
    container.innerHTML = `<p>Error loading orders: ${ordersErr.message}</p>`;
    return;
  }

  const prodMap = new Map((products || []).map(p => [p.id, p]));

  if (!orders || orders.length === 0) {
    container.innerHTML = '<p>No orders found.</p>';
    return;
  }

  container.innerHTML = '';
  orders.forEach(o => {
    const product = prodMap.get(o.product_id);
    const name = product ? product.name : `Product ID: ${o.product_id}`;
    const buyerEmail = o.customer_email || '';
    const buyerPhone = o.customer_phone || '';

    const card = document.createElement('div');
    card.style.padding = '12px';
    card.style.borderBottom = '1px solid rgba(0,0,0,0.04)';

    const title = document.createElement('h3');
    title.innerText = name;
    card.appendChild(title);

    const meta = document.createElement('p');
    meta.style.color = 'var(--gray)';
    meta.innerHTML = `Quantity: <strong>${o.quantity}</strong> · Status: <strong>${o.status || 'PENDING'}</strong>`;
    card.appendChild(meta);

    const ids = document.createElement('p');
    ids.style.fontSize = '13px';
    ids.style.color = '#666';
    ids.innerText = `User ID: ${o.user_id} · Order ID: ${o.id}`;
    card.appendChild(ids);

    const contactDiv = document.createElement('div');
    contactDiv.style.marginTop = '8px';
    if (buyerEmail) {
      const emailLink = document.createElement('a');
      emailLink.href = `mailto:${buyerEmail}?subject=Order%20${o.id}%20Pickup%20and%20Payment`;
      const btn = document.createElement('button');
      btn.innerText = 'Email Buyer';
      emailLink.appendChild(btn);
      contactDiv.appendChild(emailLink);
    }
    if (buyerPhone) {
      const phoneLink = document.createElement('a');
      phoneLink.href = `tel:${buyerPhone}`;
      const btn2 = document.createElement('button');
      btn2.innerText = 'Call Buyer';
      btn2.style.marginLeft = '8px';
      phoneLink.appendChild(btn2);
      contactDiv.appendChild(phoneLink);
    }
    if (!buyerEmail && !buyerPhone) {
      const p = document.createElement('p');
      p.style.color = 'var(--gray)';
      p.innerText = 'No buyer contact on record';
      contactDiv.appendChild(p);
    }
    card.appendChild(contactDiv);

    container.appendChild(card);
  });
}

// --- add / delete product handlers ---
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

    ['p-name','p-size','p-color','p-thickness','p-price','p-quantity'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    addProdBtn.innerText = "Add Product";
    addProdBtn.disabled = false;
  };
}

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

  await loadProducts();
};

// --- admin contact save ---
const saveAdminContactBtn = document.getElementById('save-admin-contact');
if (saveAdminContactBtn) {
  saveAdminContactBtn.onclick = async () => {
    const displayName = document.getElementById('admin-display-name').value;
    const contactEmail = document.getElementById('admin-contact-email').value;
    const contactPhone = document.getElementById('admin-contact-phone').value;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please sign in.');
      return;
    }

    const payload = {
      user_id: user.id,
      email: user.email,
      display_name: displayName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      is_admin: true
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });

    if (error) {
      alert('Failed to save: ' + error.message);
    } else {
      alert('Saved admin contact info.');
    }
  };
}

// --- notifications for admin ---
async function refreshNewOrdersCount() {
  const { data, error } = await supabase.from('orders').select('id').eq('notified_admins', false);
  if (error) return console.warn('failed count', error);
  const count = data ? data.length : 0;
  if (count > 0) {
    newOrdersBadge.style.display = 'inline-block';
    newOrdersBadge.innerText = `${count} new`;
    markNotifiedBtn.style.display = 'inline-block';
  } else {
    newOrdersBadge.style.display = 'none';
    markNotifiedBtn.style.display = 'none';
  }
}

if (markNotifiedBtn) {
  markNotifiedBtn.onclick = async () => {
    const { error } = await supabase.from('orders').update({ notified_admins: true }).eq('notified_admins', false);
    if (error) alert('Failed to mark notified: ' + error.message);
    await refreshNewOrdersCount();
    await loadOrders();
  };
}

// Start
checkAdmin();
