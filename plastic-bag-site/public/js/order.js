import { supabase } from "./supabase.js";
import { CONFIG } from "./config.js";

// Make it global so HTML button can access it
window.initiateOrder = async function(productId, productName, price) {
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Check Auth
  if (!user) {
    alert("Please sign in to continue.");
    window.location.href = "auth.html";
    return;
  }

  const qty = document.getElementById(`qty-${productId}`).value;
  const totalAmount = (price * (qty / 1000));

  // 2. Confirm (Simple version of "Checkout")
  const confirmMsg = `Order: ${productName}\nQuantity: ${qty}\nTotal: $${totalAmount}\n\nProceed to payment?`;
  if (!confirm(confirmMsg)) return;

  // 3. Simulate Payment (Since we don't have a real backend server for Stripe Sessions yet)
  // In a real app, you would call your backend here to get a Stripe Session ID.
  // For now, we assume payment success to allow data entry.
  
  await createOrder(productId, qty, user.id);
};

async function createOrder(productId, qty, userId) {
  const { error } = await supabase.from("orders").insert({
    product_id: productId,
    quantity: qty,
    user_id: userId,
    status: 'paid'
  });

  if (error) {
    alert("Error processing order: " + error.message);
  } else {
    alert("Payment successful! Order # " + Date.now().toString().slice(-6) + " confirmed.");
    window.location.href = "products.html"; // Refresh
  }
}