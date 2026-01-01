import { supabase } from "./supabase.js";

const container = document.getElementById("product-list");

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*");
  
  if (error) {
    console.error(error);
    return;
  }

  container.innerHTML = ""; // Clear loader
  
  data.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div>
        <h3 style="font-size: 22px; font-weight: 700;">${p.name}</h3>
        <p style="margin: 4px 0; color: var(--black); font-weight: 500;">${p.size} &middot; ${p.color}</p>
        <p style="font-size: 14px; color: var(--gray);">${p.thickness_microns} microns thickness</p>
      </div>
      
      <div class="price">
        <div style="font-size: 24px; font-weight: 800; color: var(--blue); margin-bottom: 8px;">$${p.price_per_1000} <span style="font-size: 14px; font-weight: 500; color: var(--gray);">/ 1k units</span></div>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
           <div style="display: flex; align-items: center; gap: 12px;">
             <label style="font-size: 14px; font-weight: 600;">Quantity:</label>
             <input type="number" id="qty-${p.id}" value="1000" step="1000" min="1000">
           </div>
           <button style="width: 100%;" onclick="window.initiateOrder('${p.id}', '${p.name}', ${p.price_per_1000})">Order Now</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

loadProducts();