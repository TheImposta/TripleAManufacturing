// public/js/order.js
import { supabase } from './supabase.js';

// Make it global for convenience
export async function initiateOrder(productId, productName, price) {
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Check Auth
  if (!user) {
    alert('Please sign in to continue.');
    window.location.href = 'auth.html';
    return;
  }

  const qtyEl = document.getElementById(`qty-${productId}`);
  const qty = qtyEl ? parseInt(qtyEl.value || '0', 10) : 0;
  if (!qty || isNaN(qty) || qty < 1) {
    alert('Please enter a valid quantity.');
    return;
  }

  const totalAmount = (price * (qty / 1000));

  const confirmMsg = `Order: ${productName}\nQuantity: ${qty}\nTotal: $${totalAmount}\n\nProceed to place order?`;
  if (!confirm(confirmMsg)) return;

  // Get the user's profile contact info
  let profile = null;
  try {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).limit(1).single();
    profile = data;
  } catch (e) {
    // ignore, profile may not exist
  }

  const payload = {
    product_id: productId,
    quantity: qty,
    user_id: user.id,
    status: 'pending',
    notified_admins: false,
    customer_email: profile?.email || user.email || null,
    customer_phone: profile?.phone || (user.phone || null)
  };

  const { error } = await supabase.from('orders').insert([payload]);

  if (error) {
    alert('Error processing order: ' + error.message);
  } else {
    alert('Order placed. Admins will contact you to arrange payment and pickup.');
    window.location.href = 'orders.html';
  }
}
