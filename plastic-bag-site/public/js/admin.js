import { supabase } from './supabase.js';

const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('auth-error');

// --- 1. AUTHENTICATION & SECURITY ---

/**
 * Checks if the user is an admin based on user/app metadata.
 * Supabase can expose metadata under different keys depending on SDK/version:
 *  - user.user_metadata
 *  - user.user_meta_data
 *  - user.raw_user_meta_data
 *  - user.raw_app_meta_data
 *  - user.app_metadata
 *
 * This function tests the common places for the is_admin flag and also
 * falls back to an email-based heuristic.
 */
function isUserAdmin(user) {
    if (!user) return false;

    return Boolean(
        // common modern key
        (user.user_metadata && user.user_metadata.is_admin === true) ||
        // older/alternate typo key (safe to check)
        (user.user_meta_data && user.user_meta_data.is_admin === true) ||
        // the raw app/user metadata as supplied in your JSON
        (user.raw_app_meta_data && user.raw_app_meta_data.is_admin === true) ||
        (user.raw_user_meta_data && user.raw_user_meta_data.is_admin === true) ||
        // another possible key
        (user.app_metadata && user.app_metadata.is_admin === true) ||
        // fallback heuristic
        (user.email && user.email.includes('admin'))
    );
}

async function checkAdmin() {
    // Try to get the freshest session + user info
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
            // Give user a moment to see the message, then sign out
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
        // give Supabase a moment to hydrate session metadata if needed, then check
        setTimeout(checkAdmin, 300);
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
        container.innerHTML = '<p>No orders found.</p>';
        return;
    }

    container.innerHTML = data.map(o => `
        
            
                <h4>${o.products?.name || 'Unknown Product'}</h4>
                <p>Quantity: <strong>${o.quantity}</strong> · Total: <strong>$${o.total_price}</strong></p>
                <p>User ID: ${o.user_id}</p>
            
            
                
                    ${o.status || 'PENDING'}
                
            
        
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
        
            
                <h4>${p.name}</h4>
                <p>${p.size} · ${p.color} · ${p.thickness_microns}μ</p>
                <p>$${p.price_per_1000} / 1k units</p>
            
            
                Delete
            
        
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
