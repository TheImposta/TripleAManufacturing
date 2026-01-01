import { supabase } from './supabase.js';

const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('auth-error');

// Auth logic
loginBtn.onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    loginBtn.innerText = "Signing in...";
    loginBtn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        authError.innerText = 'Invalid admin credentials';
        loginBtn.innerText = "Sign In";
        loginBtn.disabled = false;
    } else {
        checkAdmin();
    }
};

logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
};

async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // In a real app, you'd check a metadata field or a 'profiles' table
        // For this MVP, we check if the email contains 'admin'
        if (user.email.includes('admin')) {
            loginSection.style.display = 'none';
            adminSection.style.display = 'block';
            loadDashboard();
        } else {
            authError.innerText = "Access denied. Admin credentials required.";
            await supabase.auth.signOut();
        }
    }
}

// Dashboard functions
async function loadDashboard() {
    loadOrders();
    loadProducts();
}

async function loadOrders() {
    const { data, error } = await supabase.from('orders').select('*, products(name)');
    const container = document.getElementById('orders-list');
    
    if (error || !data || data.length === 0) {
        container.innerHTML = '<div class="product-card"><p>No orders found.</p></div>';
        return;
    }

    container.innerHTML = data.map(o => `
        <div class="product-card" style="padding: 24px; flex-direction: row; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="font-weight: 700; font-size: 18px;">${o.products?.name || 'Unknown Product'}</h4>
                <p style="font-size: 14px; margin-bottom: 0;">Quantity: <strong>${o.quantity}</strong> &middot; Total: <strong>$${o.total_price}</strong></p>
                <p style="font-size: 12px; color: var(--gray); margin-bottom: 0;">Ordered by: ${o.user_id}</p>
            </div>
            <div style="text-align: right;">
                <span style="background: #e8e8ed; padding: 4px 12px; border-radius: 980px; font-size: 12px; font-weight: 600;">PENDING</span>
            </div>
        </div>
    `).join('');
}

async function loadProducts() {
    const { data, error } = await supabase.from('products').select('*');
    const container = document.getElementById('admin-product-list');
    
    if (error || !data) return;

    container.innerHTML = data.map(p => `
        <div class="product-card" style="padding: 24px; flex-direction: row; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="font-weight: 700; font-size: 18px;">${p.name}</h4>
                <p style="font-size: 14px; margin-bottom: 0;">${p.size} &middot; ${p.color} &middot; ${p.thickness_microns}μ</p>
            </div>
            <div style="display: flex; gap: 12px;">
                <button class="secondary" style="padding: 8px 16px; font-size: 12px;" onclick="deleteProduct('${p.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

const addProdBtn = document.getElementById('addProdBtn');
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
        alert('Product added successfully');
        loadProducts();
        // Clear inputs
        ['p-name', 'p-size', 'p-color', 'p-thickness', 'p-price'].forEach(id => document.getElementById(id).value = '');
    }
    
    addProdBtn.innerText = "Add Product";
    addProdBtn.disabled = false;
};

window.deleteProduct = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) alert(error.message);
        else loadProducts();
    }
};

checkAdmin();
