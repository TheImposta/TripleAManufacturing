import { supabase } from "./supabase.js";

const container = document.getElementById("product-list");

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*");

  if (error) {
    console.error(error);
    container.innerHTML = `<p>Error loading catalog: ${error.message}</p>`;
    return;
  }

  container.innerHTML = ""; // Clear loader

  data.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";

    const qty = (typeof p.quantity === 'number') ? p.quantity : null;
    const outOfStock = qty !== null && qty <= 0;

    card.style.position = 'relative';
    if (outOfStock) {
      card.style.opacity = '0.6';
    }

    card.innerHTML = `
      <h3>${p.name}</h3>
      <p>${p.size || ''} · ${p.color || ''}</p>
      <p>${p.thickness_microns || ''} microns thickness</p>

      <p style="margin-top:12px; font-weight:700;">$${p.price_per_1000 || '—'} / 1k units</p>

      <div style="margin-top:12px;">
        <label style="font-size: 14px; font-weight: 600;">Quantity (units)</label>
        <input id="qty-${p.id}" type="number" min="1" value="1000" style="width:120px; margin-left:8px;">
      </div>

      <div style="margin-top:12px;">
        <button onclick="initiateOrder('${p.id}', '${(p.name||'').replace(/'/g,"\\'")}', ${p.price_per_1000 || 0})" ${outOfStock ? 'disabled' : ''}>Order Now</button>
      </div>
    `;

    if (outOfStock) {
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.padding = '12px';
      overlay.style.fontWeight = '800';
      overlay.style.color = '#333';
      overlay.style.background = 'transparent';
      overlay.innerText = 'Out of Stock, will be available soon';
      card.appendChild(overlay);
    }

    container.appendChild(card);
  });
}

loadProducts();
