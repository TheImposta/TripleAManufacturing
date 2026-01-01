// public/js/orders.js
import { supabase } from './supabase.js';

const container = document.getElementById('user-orders');

async function loadUserOrders() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }

  const { data: orders, error } = await supabase.from('orders').select('*').eq('user_id', user.id).order('id', { ascending: false });
  if (error) {
    container.innerHTML = `<p>Error loading orders: ${error.message}</p>`;
    return;
  }

  // fetch admin contacts
  const { data: admins } = await supabase.from('profiles').select('display_name,contact_email,contact_phone').eq('is_admin', true);

  container.innerHTML = '';
  if (!orders || orders.length === 0) {
    container.innerHTML = '<p>No orders found.</p>';
    return;
  }

  orders.forEach(o => {
    const el = document.createElement('div');
    el.className = 'product-card';
    el.style.marginBottom = '12px';
    el.innerHTML = `
      <h3>Order ${o.id}</h3>
      <p style="color:var(--gray);">Product: ${o.product_id} · Quantity: <strong>${o.quantity}</strong></p>
      <p style="color:var(--gray);">Status: <strong>${o.status}</strong></p>
      <p style="font-size:13px; color:#666;">Customer contact: ${o.customer_email || '—'} ${o.customer_phone ? ' · ' + o.customer_phone : ''}</p>
      <div id="admin-contacts-${o.id}" style="margin-top:8px;"></div>
    `;
    container.appendChild(el);

    const adminContactsDiv = document.getElementById(`admin-contacts-${o.id}`);
    if (admins && admins.length > 0) {
      admins.forEach(a => {
        const contact = document.createElement('div');
        contact.style.marginTop = '6px';
        const name = a.display_name || a.contact_email || 'Admin';
        contact.innerHTML = `
          <strong>${name}</strong>
          ${a.contact_email ? `<div><a href="mailto:${a.contact_email}?subject=Order%20${o.id}%20Pickup%20and%20Payment">Email admin</a></div>` : ''}
          ${a.contact_phone ? `<div><a href="tel:${a.contact_phone}">Call admin</a></div>` : ''}
        `;
        adminContactsDiv.appendChild(contact);
      });
    } else {
      adminContactsDiv.innerHTML = '<p style="color:var(--gray);">No admin contacts available.</p>';
    }
  });
}

if (container) loadUserOrders();
