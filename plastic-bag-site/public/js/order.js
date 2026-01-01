import { supabase } from "./supabase.js";

// Make it global so HTML button can access it
window.initiateOrder = async function(productId, productName, price) {
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Check Auth
  if (!user) {
    alert("Please sign in to continue.");
    window.location.href = "auth.html";
    return;
  }

  const qtyEl = document.getElementById(`qty-${productId}`);
  const qty = qtyEl ? parseInt(qtyEl.value || '0', 10) : 0;
  if (!qty || isNaN(qty) || qty < 1) {
    alert("Please enter a valid quantity.");
    return;
  }

  const totalAmount = (price * (qty / 1000));

  // 2. Confirm (Simple version of "Checkout")
  const confirmMsg = `Order: ${productName}\nQuantity: ${qty}\nTotal: $${totalAmount}\n\nProceed to payment?`;
  if (!confirm(confirmMsg)) return;

  // 3. Simulate Payment (external/offsite payment)
  // Save order and include customer contact so admin can follow up
  await createOrder(productId, qty, user);
};

async function createOrder(productId, qty, user) {
  const payload = {
    product_id: productId,
    quantity: qty,
    user_id: user.id,
    status: 'paid'
  };

  // Include buyer contact info so admins can reach them (DB must have these columns)
  if (user.email) payload.customer_email = user.email;
  if (user.phone) payload.customer_phone = user.phone;

  const { error } = await supabase.from("orders").insert([payload]);

  if (error) {
    alert("Error processing order: " + error.message);
  } else {
    alert("Order confirmed. An admin will contact you to arrange payment and pickup.");
    window.location.href = "products.html";
  }
}
