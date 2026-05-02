const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const STORAGE_KEYS = {
  cart: "giftly_cart_v1",
  wishlist: "giftly_wishlist_v1",
};

const PRODUCTS = [
  {
    id: "mug-01",
    name: "Custom Photo Mug",
    category: "Mugs",
    occasion: ["Birthday", "Anniversary"],
    price: 14.99,
    image: "./assets/products/custom-photo-mug.svg",
  },
  {
    id: "frame-01",
    name: "Pastel Photo Frame",
    category: "Frames",
    occasion: ["Wedding", "Anniversary"],
    price: 24.0,
    image: "./assets/products/pastel-photo-frame.svg",
  },
  {
    id: "card-01",
    name: "Handwritten Card Print",
    category: "Cards",
    occasion: ["Birthday", "Baby"],
    price: 7.5,
    image: "./assets/products/handwritten-card-print.svg",
  },
  {
    id: "acc-01",
    name: "Engraved Keychain",
    category: "Accessories",
    occasion: ["Anniversary", "Wedding"],
    price: 9.99,
    image: "./assets/products/engraved-keychain.svg",
  },
  {
    id: "mug-02",
    name: "Lavender Quote Mug",
    category: "Mugs",
    occasion: ["Birthday"],
    price: 12.5,
    image: "./assets/products/lavender-quote-mug.svg",
  },
  {
    id: "frame-02",
    name: "Soft Blue Collage Frame",
    category: "Frames",
    occasion: ["Baby", "Birthday"],
    price: 28.0,
    image: "./assets/products/soft-blue-collage-frame.svg",
  },
];

function money(n) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let state = {
  occasion: "All",
  search: "",
  category: "All",
  cart: loadJSON(STORAGE_KEYS.cart, []),
  wishlist: new Set(loadJSON(STORAGE_KEYS.wishlist, [])),
  modalProductId: null,
  modalImageDataUrl: "",
  modalText: "",
};

function persist() {
  saveJSON(STORAGE_KEYS.cart, state.cart);
  saveJSON(STORAGE_KEYS.wishlist, Array.from(state.wishlist));
}

function cartCount() {
  return state.cart.reduce((sum, it) => sum + it.qty, 0);
}

function cartTotal() {
  return state.cart.reduce((sum, it) => sum + it.price * it.qty, 0);
}

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function matchesFilters(p) {
  const occOk = state.occasion === "All" || p.occasion.includes(state.occasion);
  const catOk = state.category === "All" || p.category === state.category;
  const q = state.search.trim().toLowerCase();
  const qOk = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  return occOk && catOk && qOk;
}

function renderProducts() {
  const grid = $("#productGrid");
  const list = PRODUCTS.filter(matchesFilters);

  if (!list.length) {
    grid.innerHTML = `
      <div class="panel" style="grid-column: span 12;">
        <div style="font-weight:900;">No results</div>
        <div class="muted">Try changing the occasion, category, or search query.</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = list
    .map((p) => {
      const wished = state.wishlist.has(p.id);
      const occ = p.occasion[0] || "All";
      return `
        <article class="card" data-id="${p.id}">
          <div class="card-media">
            <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy" />
          </div>
          <div class="card-body">
            <div class="card-title">${escapeHTML(p.name)}</div>
            <div class="meta-row">
              <span class="tag">${escapeHTML(p.category)}</span>
              <span class="tag">${escapeHTML(occ)}</span>
              <span class="price">${money(p.price)}</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn btn-ghost" type="button" data-action="wishlist">
              ${wished ? "Wishlisted" : "Wishlist"}
            </button>
            <button class="btn btn-primary" type="button" data-action="details">Customize</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(productId) {
  const p = findProduct(productId);
  if (!p) return;

  state.modalProductId = productId;
  state.modalImageDataUrl = "";
  state.modalText = "";

  $("#modalTitle").textContent = p.name;
  $("#modalMeta").textContent = `${p.category} • ${money(p.price)} • ${p.occasion.join(", ")}`;
  $("#customTextInput").value = "";
  $("#imageInput").value = "";
  $("#addHint").textContent = "";

  $("#previewImage").src = p.image || "";
  $("#previewImage").alt = p.image ? p.name : "";
  $("#previewText").textContent = "";

  const wished = state.wishlist.has(p.id);
  $("#toggleWishlistBtn").textContent = wished ? "Wishlisted" : "Wishlist";

  show("#modalBackdrop", "#productModal");
  $("#customTextInput").focus();
}

function closeModal() {
  state.modalProductId = null;
  hide("#modalBackdrop", "#productModal");
}

function openCart() {
  renderCart();
  show("#drawerBackdrop", "#cartDrawer");
  $("#closeCartBtn").focus();
}

function closeCart() {
  hide("#drawerBackdrop", "#cartDrawer");
}

function show(...sels) {
  for (const s of sels) {
    const el = $(s);
    el.hidden = false;
  }
  document.body.style.overflow = "hidden";
}

function hide(...sels) {
  for (const s of sels) {
    const el = $(s);
    el.hidden = true;
  }
  if ($("#cartDrawer").hidden && $("#productModal").hidden) document.body.style.overflow = "";
}

function addToCart({ productId, customText, imageDataUrl }) {
  const p = findProduct(productId);
  if (!p) return;

  const key = `${productId}::${customText || ""}::${imageDataUrl ? "img" : "noimg"}`;
  const existing = state.cart.find((it) => it.key === key);
  if (existing) existing.qty += 1;
  else {
    state.cart.push({
      key,
      productId,
      name: p.name,
      price: p.price,
      customText: customText || "",
      imageDataUrl: imageDataUrl || "",
      qty: 1,
    });
  }
  persist();
  syncCartUI();
}

function removeCartItem(key) {
  state.cart = state.cart.filter((it) => it.key !== key);
  persist();
  syncCartUI();
  renderCart();
}

function setQty(key, qty) {
  const it = state.cart.find((x) => x.key === key);
  if (!it) return;
  it.qty = Math.max(1, Math.min(99, qty));
  persist();
  syncCartUI();
  renderCart();
}

function toggleWishlist(productId) {
  if (state.wishlist.has(productId)) state.wishlist.delete(productId);
  else state.wishlist.add(productId);
  persist();
  renderProducts();

  if (state.modalProductId === productId) {
    $("#toggleWishlistBtn").textContent = state.wishlist.has(productId) ? "Wishlisted" : "Wishlist";
  }
}

function syncCartUI() {
  $("#cartCount").textContent = String(cartCount());
  $("#cartSub").textContent = `${cartCount()} items`;
  $("#cartTotal").textContent = money(cartTotal());
}

function renderCart() {
  const wrap = $("#cartItems");
  const empty = $("#emptyCart");
  if (!state.cart.length) {
    wrap.innerHTML = "";
    empty.hidden = false;
    $("#checkoutNote").textContent = "";
    syncCartUI();
    return;
  }

  empty.hidden = true;
  wrap.innerHTML = state.cart
    .map((it) => {
      const preview = it.imageDataUrl
        ? `<div class="tag" title="Image added">Photo ✓</div>`
        : `<div class="tag" title="No image">No photo</div>`;
      const txt = it.customText ? `<div class="tag" title="Custom text">${escapeHTML(it.customText)}</div>` : "";

      return `
        <div class="cart-item">
          <div>
            <div class="cart-item-title">${escapeHTML(it.name)}</div>
            <div class="cart-item-meta meta-row">
              ${preview}
              ${txt}
              <div class="price">${money(it.price)}</div>
            </div>
            <div class="qty-row">
              <label class="field" style="margin:0;">
                <span class="label">Qty</span>
                <input class="input qty" type="number" min="1" max="99" value="${it.qty}" data-qty="${it.key}" />
              </label>
              <button class="btn danger" type="button" data-remove="${it.key}">Remove</button>
            </div>
          </div>
          <div></div>
        </div>
      `;
    })
    .join("");

  const total = cartTotal();
  $("#checkoutNote").textContent = "This is a demo checkout. No payment is processed.";
  $("#cartTotal").textContent = money(total);
  syncCartUI();
}

function dummyCheckout() {
  if (!state.cart.length) return;
  const orderId = `GF-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  state.cart = [];
  persist();
  syncCartUI();
  renderCart();
  $("#checkoutNote").textContent = `Order placed (demo): ${orderId}`;
}

function bindEvents() {
  // Occasion chips
  $$(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".chip").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.occasion = btn.dataset.occasion || "All";
      renderProducts();
    });
  });

  // Search + Category
  $("#searchInput").addEventListener("input", (e) => {
    state.search = e.target.value || "";
    renderProducts();
  });
  $("#categorySelect").addEventListener("change", (e) => {
    state.category = e.target.value || "All";
    renderProducts();
  });

  // Grid actions
  $("#productGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "details") openModal(id);
    if (action === "wishlist") toggleWishlist(id);
  });

  // Modal controls
  $("#closeModalBtn").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("#productModal").hidden) closeModal();
      if (!$("#cartDrawer").hidden) closeCart();
    }
  });

  $("#customTextInput").addEventListener("input", (e) => {
    state.modalText = e.target.value || "";
    $("#previewText").textContent = state.modalText;
  });

  $("#imageInput").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      state.modalImageDataUrl = "";
      $("#previewImage").src = "";
      return;
    }
    const dataUrl = await fileToDataURL(file);
    state.modalImageDataUrl = dataUrl;
    $("#previewImage").src = dataUrl;
    $("#previewImage").alt = "Uploaded preview";
  });

  $("#addToCartBtn").addEventListener("click", () => {
    const p = findProduct(state.modalProductId);
    if (!p) return;
    const customText = $("#customTextInput").value || "";
    addToCart({ productId: p.id, customText, imageDataUrl: state.modalImageDataUrl });
    $("#addHint").textContent = "Added to cart. You can checkout anytime.";
  });

  $("#toggleWishlistBtn").addEventListener("click", () => {
    const p = findProduct(state.modalProductId);
    if (!p) return;
    toggleWishlist(p.id);
  });

  // Cart drawer
  $("#openCartBtn").addEventListener("click", openCart);
  $("#closeCartBtn").addEventListener("click", closeCart);
  $("#drawerBackdrop").addEventListener("click", closeCart);
  $("#checkoutBtn").addEventListener("click", dummyCheckout);

  $("#cartItems").addEventListener("click", (e) => {
    const removeBtn = e.target.closest("button[data-remove]");
    if (removeBtn) removeCartItem(removeBtn.dataset.remove);
  });
  $("#cartItems").addEventListener("input", (e) => {
    const inp = e.target.closest("input[data-qty]");
    if (!inp) return;
    const key = inp.dataset.qty;
    const n = Number(inp.value);
    if (Number.isFinite(n) && n >= 1) setQty(key, n);
  });

  // Mini customize demo
  $("#miniMessage").addEventListener("input", (e) => {
    $("#miniText").textContent = e.target.value || "Your message here";
  });
  $("#miniRandomize").addEventListener("click", () => {
    const msgs = [
      "Happy Birthday, Aanya!",
      "Forever & always.",
      "You’re my favorite person.",
      "Welcome, little one.",
      "To new memories together.",
    ];
    const m = msgs[Math.floor(Math.random() * msgs.length)];
    $("#miniMessage").value = m;
    $("#miniText").textContent = m;
  });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function init() {
  $("#year").textContent = String(new Date().getFullYear());
  renderProducts();
  syncCartUI();
  bindEvents();
}

init();

