const CONFIG = window.SALE_CONFIG || {};

const $ = (s, r = document) => r.querySelector(s);
const api = (p) => `${String(CONFIG.apiBase || "").replace(/\/$/, "")}${p}`;

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function money(n) {
  return `$${Number(n || 0).toFixed(2).replace(".00", "")}`;
}

function getTenantSlug() {
  const queryTenant = qs("tenant");
  if (queryTenant) return queryTenant;

  const host = location.hostname;

  if (
    host.includes("github.io") ||
    host.includes("pages.dev") ||
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return CONFIG.demoTenant || "nats-hair-lab";
  }

  const subdomain = host.split(".")[0];
  return subdomain || CONFIG.demoTenant || "nats-hair-lab";
}

function getWhatsAppNumber(tenant) {
  if (tenant.whatsapp_mode === "tenant_own" && tenant.whatsapp_number) {
    return tenant.whatsapp_number;
  }

  return CONFIG.whatsappNumber || tenant.whatsapp_number || "";
}

function waLink(tenant, text) {
  const number = getWhatsAppNumber(tenant);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status === "error") {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function fallbackStore(slug) {
  return {
    tenant: {
      slug,
      business_name: "Nats Hair Lab",
      business_type: "booking",
      tagline: "Book clean hair services with paid deposits.",
      hero_url: "",
      logo_url: "",
      whatsapp_number: CONFIG.whatsappNumber,
      whatsapp_mode: "platform_unified",
      payment_mode: "sale_unified",
    },
    items: [
      {
        item_id: "item_braids",
        name: "Knotless Braids",
        price: 35,
        item_type: "service",
        category: "Hair",
        description: "Deposit required. 4–6 hours.",
        requires_booking: 1,
      },
      {
        item_id: "item_wash",
        name: "Wash & Blow",
        price: 12,
        item_type: "service",
        category: "Hair",
        description: "Quick appointment slot.",
        requires_booking: 1,
      },
    ],
  };
}

async function createBooking(tenant, item) {
  try {
    const payload = {
      tenant_id: tenant.tenant_id,
      item_id: item.item_id,
      total_amount: item.price || 0,
      deposit_amount: tenant.default_deposit_amount || 0,
      notes: `Website booking request for ${item.name}`,
    };

    const result = await fetchJSON(api("/api/bookings"), {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const message = `Booking request: ${item.name} from ${tenant.business_name}. Reference: ${result.booking_id}`;
    window.location.href = waLink(tenant, message);
  } catch (error) {
    alert(`Booking failed: ${error.message}`);
  }
}

async function createOrder(tenant, item) {
  try {
    const payload = {
      tenant_id: tenant.tenant_id,
      item_summary: item.name,
      total_amount: item.price || 0,
      currency: item.currency || "USD",
    };

    const result = await fetchJSON(api("/api/orders"), {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const message = `Order request: ${item.name} from ${tenant.business_name}. Reference: ${result.order_id}`;
    window.location.href = waLink(tenant, message);
  } catch (error) {
    alert(`Order failed: ${error.message}`);
  }
}

function getCTA(tenant, item) {
  const mode = tenant.business_type;

  if (Number(item.requires_booking) === 1 || mode === "booking") return "Book Now";
  if (mode === "menu") return "Order Now";
  if (mode === "catalogue") return "Request Quote";
  return "Add to Cart";
}

function renderStore(mount, tenant, items) {
  const mode = tenant.business_type || "store";
  const categories = [...new Set(items.map((i) => i.category || "General"))];

  document.title = `${tenant.business_name} | Sale Company`;

  mount.innerHTML = `
    <div class="store-hero">
      ${
        tenant.hero_url
          ? `<img src="${tenant.hero_url}" alt="${tenant.business_name}">`
          : ""
      }
    </div>

    <div class="avatar">
      ${
        tenant.logo_url
          ? `<img src="${tenant.logo_url}" alt="${tenant.business_name}" style="width:100%;height:100%;object-fit:cover;border-radius:20px">`
          : String(tenant.business_name || "SC").slice(0, 2).toUpperCase()
      }
    </div>

    <div class="store-pad">
      <p class="eyebrow">${mode} mode</p>
      <h2 style="margin:0">${tenant.business_name}</h2>
      <p class="muted">${tenant.tagline || tenant.about || "A Sale Company powered business."}</p>

      <div class="chips">
        <span class="chip active">All</span>
        ${categories.map((x) => `<span class="chip">${x}</span>`).join("")}
      </div>

      <div class="items">
        ${items
          .map((item) => {
            const cta = getCTA(tenant, item);

            return `
              <article class="item">
                <div class="item-img">
                  ${
                    item.image_url
                      ? `<img src="${item.image_url}" alt="${item.name}">`
                      : ""
                  }
                </div>

                <div class="item-body">
                  <strong>${item.name}</strong>
                  <p class="muted">${item.description || ""}</p>
                  <div class="price">${money(item.price)}</div>

                  <button
                    class="btn gold sale-action"
                    style="margin-top:12px;width:100%"
                    data-item-id="${item.item_id}"
                  >
                    ${cta}
                  </button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>

      <div class="notice" style="margin-top:18px">
        Payments, bookings, reminders and fulfilment are confirmed through the operator’s Sale Company dashboard.
      </div>
    </div>
  `;

  document.querySelectorAll(".sale-action").forEach((button) => {
    button.addEventListener("click", () => {
      const item = items.find((i) => i.item_id === button.dataset.itemId);
      if (!item) return;

      if (Number(item.requires_booking) === 1 || tenant.business_type === "booking") {
        createBooking(tenant, item);
      } else {
        createOrder(tenant, item);
      }
    });
  });
}

async function loadStore() {
  const mount = $("#store-app");
  if (!mount) return;

  const slug = getTenantSlug();

  try {
    const data = await fetchJSON(api(`/api/storefront/${slug}`));
    renderStore(mount, data.tenant, data.items || []);
  } catch (error) {
    console.warn("Using fallback store:", error.message);
    const data = fallbackStore(slug);
    renderStore(mount, data.tenant, data.items);
  }
}

loadStore();
