import { supabase } from './supabase.js';

const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('auth-error');

// --- 1. AUTHENTICATION & SECURITY ---

/**
 * Checks if the user is an admin based on user_metadata.
 * This is the secure way we set up in the Supabase dashboard.
 */
async function checkAdmin() {
    // We use getSession and refreshSession to ensure we have the latest metadata
    const { data: { session } } = await supabase.auth.refreshSession();
    
    if (session && session.user) {
        const user = session.user;
        
        // CHECK: Does the user have the is_admin flag in their metadata?
        const isAdmin = user.user_meta_data && user.user_meta_data.is_admin === true;
        
        // BACKUP CHECK: In case you are still using an email with 'admin' in it
        const hasAdminEmail = user.email.includes('admin');

        if (isAdmin || hasAdminEmail) {
            loginSection.style.display = 'none';
            adminSection.style.display = 'block';
            loadDashboard();
        } else {
            authError.innerText = "Access denied. Admin credentials required.";
            // Wait a moment so they can see the error, then sign out
            setTimeout(async () => {
                await supabase.auth.signOut();
            }, 2000);
        }
    } else {
        // No session found, show login
        loginSection.style.display = 'block';
        adminSection.style.display = 'none';
    }
}

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
        // Successful login, run the admin check
        checkAdmin();
    }
};

logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
};

// --- 2. DASHBOARD LOADING ---

async function loadDashboard() {
    loadOrders();
    loadProducts();
}

async function loadOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('*, products(name)')
        .order('created_at', { ascending: false });

    const container = document.getElementById('orders-list');
    
    if (error || !data || data.length === 0) {
        container.innerHTML = '<div class="product-card"><p>No orders found.</p></div>';
        return;
    }

    container.innerHTML = data.map(o => `
        <div class="product-card" style="padding: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
                <h4 style="font-weight: 700; font-size: 18px; margin: 0;">${o.products?.name || 'Unknown Product'}</h4>
                <p style="font-size: 14px; margin: 4px 0;">Quantity: <strong>${o.quantity}</strong> &middot; Total: <strong>$${o.total_price}</strong></p>
                <p style="font-size: 12px; color: var(--gray); margin: 0;">User ID: ${o.user_id}</p>
            </div>
            <div style="text-align: right;">
                <span style="background: #e8e8ed; padding: 4px 12px; border-radius: 980px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                    ${o.status || 'PENDING'}
                </span>
            </div>
        </div>
    `).join('');
}

async function loadProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    const container = document.getElementById('admin-product-list');
    
    if (error || !data) return;

    container.innerHTML = data.map(p => `
        <div class="product-card" style="padding: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
                <h4 style="font-weight: 700; font-size: 18px; margin: 0;">${p.name}</h4>
                <p style="font-size: 14px; margin: 4px 0;">${p.size} &middot; ${p.color} &middot; ${p.thickness_microns}μ</p>
                <p style="font-size: 14px; font-weight: 600; color: var(--blue); margin: 0;">$${p.price_per_1000} / 1k units</p>
            </div>
            <div style="display: flex; gap: 12px;">
                <button class="secondary" style="padding: 8px 16px; font-size: 12px; color: #ff3b30; border-color: #ff3b30;" onclick="deleteProduct('${p.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// --- 3. DATABASE ACTIONS ---

const addProdBtn = document.getElementById('addProdBtn');
if (addProdBtn) {
    addProdBtn.onclick = async () => {
        const name = document.getElementById('p-name').value;
        const size = document.getElementById('p-size').value;
        const color = document.getElementById('p-color').value;
        const thickness = document.getElementById('p-thickness').value;
        const price = document.getElementById('p-price').value;

        if (!name || !price) {
            alert("Name and price are required.");
            return;
        }

        addProdBtn.innerText = "Adding...";
        addProdBtn.disabled = true;

        const { error } = await supabase.from('products').insert({
            name,
            size,
            color,
            thickness_microns: parseInt(thickness),
            price_per_1000: parseFloat(price)
        });

        if (error) {
            alert(error.message);
        } else {
            loadProducts();
            // Clear inputs
            ['p-name', 'p-size', 'p-color', 'p-thickness', 'p-price'].forEach(id => document.getElementById(id).value = '');
        }
        
        addProdBtn.innerText = "Add Product";
        addProdBtn.disabled = false;
    };
}

// Attach delete to window so the HTML onclick can find it
window.deleteProduct = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) alert(error.message);
        else loadProducts();
    }
};

// Start the check on page load
checkAdmin();
