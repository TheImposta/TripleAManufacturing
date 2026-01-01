import { supabase } from './supabase.js';

const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('auth-error');

// --- 1. AUTHENTICATION & SECURITY ---

/**
 * Checks if the user is an admin based on user/app metadata.
 * Tests common metadata keys (raw_app_meta_data, user_metadata, app_metadata, etc.).
 */
function isUserAdmin(user) {
    if (!user) return false;

    return Boolean(
        (user.user_metadata && user.user_metadata.is_admin === true) ||
        (user.user_meta_data && user.user_meta_data.is_admin === true) ||
        (user.raw_app_meta_data && user.raw_app_meta_data.is_admin === true) ||
        (user.raw_user_meta_data && user.raw_user_meta_data.is_admin === true) ||
        (user.app_metadata && user.app_metadata.is_admin === true) ||
        // fallback: any provider-specific is_admin flags or email heuristic
        (user.email && user.email.includes('admin'))
    );
}

async function checkAdmin() {
    // Get current user and session
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
            loadDashboard();
        } else {
            authError.innerText = "Access denied. Admin credentials required.";
            setTimeout(async () => {
                await supabase.auth.signOut();
            }, 1500);
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
      // Post-login: brief delay to allow metadata/session propagation
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

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<p>Error loading products: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p>No products found.</p>';
        return;
    }

    container.innerHTML = data.map(p => `
      <div class="product-card" style="padding:16px;">
        <h4>${p.name}</h4>
        <p style="color:var(--gray); margin-top:6px;">${p.size} · ${p.color} · ${p.thickness_microns}μ</p>
        <p style="margin-top:12px; font-weight:700;">$${p.price_per_1000} / 1k units</p>
        <div style="margin-top:12px;">
          <button onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </div>
    `).join('');
}

// Load orders and map product names (fetch products once and map by id)
async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    container.innerHTML = '<p>Loading orders...</p>';

    const [{ data: orders, error: ordersErr }, { data: products, error: prodErr }] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*')
    ]);

    if (ordersErr) {
        container.innerHTML = `<p>Error loading orders: ${ordersErr.message}</p>`;
        return;
    }

    if (prodErr) {
        // products failing is not fatal; continue but product names may be missing
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
        return `
          <div style="padding:12px; border-bottom:1px solid rgba(0,0,0,0.04);">
            <h4 style="margin-bottom:6px;">${name}</h4>
            <p style="color:var(--gray); margin-bottom:6px;">Quantity: <strong>${o.quantity}</strong> · Status: <strong>${o.status || 'PENDING'}</strong></p>
            <p style="font-size:13px; color:#666;">User ID: ${o.user_id} · Order ID: ${o.id}</p>
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

        if (!name || !price) {
            alert("Name and price are required.");
            return;
        }

        addProdBtn.innerText = "Adding...";
        addProdBtn.disabled = true;

        const { data, error } = await supabase.from('products').insert([{
            name,
            size,
            color,
            thickness_microns: isNaN(thickness) ? null : thickness,
            price_per_1000: isNaN(price) ? null : price
        }]);

        if (error) {
            alert("Failed to add product: " + error.message);
            addProdBtn.innerText = "Add Product";
            addProdBtn.disabled = false;
            return;
        }

        // Refresh inventory and orders
        await loadProducts();
        await loadOrders();

        // Clear inputs
        ['p-name', 'p-size', 'p-color', 'p-thickness', 'p-price'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        addProdBtn.innerText = "Add Product";
        addProdBtn.disabled = false;
    };
}

// Attach delete to window so the HTML onclick can find it
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

// Start the admin check on load
checkAdmin();
