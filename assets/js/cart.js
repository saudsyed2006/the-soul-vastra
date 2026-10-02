/**
 * THE SOUL VASTRA - Cart & Wishlist State Management
 * Persistent with localStorage, drawer interactions, and shipping progress
 */

class SoulCart {
  constructor() {
    this.storageKey = "soul_vastra_cart";
    this.wishlistKey = "soul_vastra_wishlist";
    this.freeShippingThreshold = 1499;
    this.items = this.loadCart();
    this.wishlist = this.loadWishlist();
    this.init();
  }

  loadCart() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("Could not read cart from localStorage", e);
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (e) {
      console.warn("Could not save cart to localStorage", e);
    }
    this.updateUI();
  }

  loadWishlist() {
    try {
      const data = localStorage.getItem(this.wishlistKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveWishlist() {
    try {
      localStorage.setItem(this.wishlistKey, JSON.stringify(this.wishlist));
    } catch (e) {
      console.warn("Could not save wishlist", e);
    }
    this.updateWishlistUI();
  }

  init() {
    // Render on boot
    this.updateUI();
    this.updateWishlistUI();
    this.setupListeners();
  }

  setupListeners() {
    // Close cart drawer on backdrop click or close button
    const backdrop = document.getElementById("cartBackdrop");
    const closeBtn = document.getElementById("cartCloseBtn");
    const openBtns = document.querySelectorAll(".cart-toggle-btn");

    if (backdrop) {
      backdrop.addEventListener("click", () => this.closeDrawer());
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeDrawer());
    }
    openBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.openDrawer();
      });
    });

    // Handle escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeDrawer();
      }
    });
  }

  openDrawer() {
    const drawer = document.getElementById("cartDrawer");
    const backdrop = document.getElementById("cartBackdrop");
    if (drawer && backdrop) {
      drawer.classList.add("active");
      backdrop.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  closeDrawer() {
    const drawer = document.getElementById("cartDrawer");
    const backdrop = document.getElementById("cartBackdrop");
    if (drawer && backdrop) {
      drawer.classList.remove("active");
      backdrop.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  addItem(productId, size = "M", quantity = 1) {
    const catalog = window.SOUL_PRODUCTS || SOUL_PRODUCTS;
    const product = catalog.find((p) => p.id === productId);
    if (!product) return;

    const existingIndex = this.items.findIndex(
      (item) => item.id === productId && item.size === size
    );

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        subtitle: product.subtitle,
        price: product.price,
        image: product.image,
        size: size,
        quantity: quantity
      });
    }

    this.saveCart();
    this.openDrawer();
    this.showToast(`Added "${product.name}" (${size}) to your bag`);
  }

  removeItem(productId, size) {
    const item = this.items.find((i) => i.id === productId && i.size === size);
    this.items = this.items.filter(
      (i) => !(i.id === productId && i.size === size)
    );
    this.saveCart();
    if (item) {
      this.showToast(`Removed "${item.name}" from your bag`);
    }
  }

  updateQuantity(productId, size, delta) {
    const index = this.items.findIndex(
      (item) => item.id === productId && item.size === size
    );
    if (index > -1) {
      const newQty = this.items[index].quantity + delta;
      if (newQty <= 0) {
        this.removeItem(productId, size);
      } else {
        this.items[index].quantity = newQty;
        this.saveCart();
      }
    }
  }

  getTotalCount() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  getSubtotal() {
    return this.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  toggleWishlist(productId) {
    const index = this.wishlist.indexOf(productId);
    const product = SOUL_PRODUCTS.find((p) => p.id === productId);
    if (index > -1) {
      this.wishlist.splice(index, 1);
      this.showToast(`Removed from your wishlist`);
    } else {
      this.wishlist.push(productId);
      this.showToast(`Saved "${product ? product.name : 'Item'}" to your wishlist`);
    }
    this.saveWishlist();
    return this.wishlist.includes(productId);
  }

  isWishlisted(productId) {
    return this.wishlist.includes(productId);
  }

  updateWishlistUI() {
    // Update badge in header if exists
    const badges = document.querySelectorAll(".wishlist-counter");
    badges.forEach((b) => {
      b.textContent = this.wishlist.length;
      b.style.display = this.wishlist.length > 0 ? "flex" : "none";
    });

    // Update active heart buttons
    document.querySelectorAll("[data-wishlist-id]").forEach((btn) => {
      const id = btn.getAttribute("data-wishlist-id");
      if (this.isWishlisted(id)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  updateUI() {
    // 1. Update counters
    const count = this.getTotalCount();
    const counters = document.querySelectorAll(".cart-counter");
    counters.forEach((c) => {
      c.textContent = count;
      c.classList.remove("pulse");
      void c.offsetWidth; // trigger reflow
      c.classList.add("pulse");
    });

    // 2. Render Drawer List
    const listContainer = document.getElementById("cartItemsList");
    const emptyState = document.getElementById("cartEmptyState");
    const footerContainer = document.getElementById("cartDrawerFooter");
    const subtotalEl = document.getElementById("cartSubtotal");
    const progressText = document.getElementById("shippingProgressText");
    const progressBar = document.getElementById("shippingProgressBar");

    const subtotal = this.getSubtotal();

    if (subtotalEl) {
      subtotalEl.textContent = formatCurrency(subtotal);
    }

    // Shipping progress bar
    if (progressBar && progressText) {
      if (subtotal >= this.freeShippingThreshold) {
        progressBar.style.width = "100%";
        progressText.innerHTML = `<strong>YOU'VE UNLOCKED FREE EXPRESS SHIPPING!</strong>`;
      } else {
        const remaining = this.freeShippingThreshold - subtotal;
        const pct = Math.min(100, Math.round((subtotal / this.freeShippingThreshold) * 100));
        progressBar.style.width = `${pct}%`;
        progressText.innerHTML = `Add <strong>${formatCurrency(remaining)}</strong> more for <strong>FREE EXPRESS SHIPPING</strong>`;
      }
    }

    if (this.items.length === 0) {
      if (listContainer) listContainer.style.display = "none";
      if (emptyState) emptyState.style.display = "flex";
      if (footerContainer) footerContainer.style.display = "none";
    } else {
      if (listContainer) {
        listContainer.style.display = "block";
        listContainer.innerHTML = this.items
          .map(
            (item) => `
          <div class="cart-item">
            <div class="cart-item-image">
              <img src="${item.image}" alt="${item.name}" loading="lazy" />
            </div>
            <div class="cart-item-details">
              <div class="cart-item-header">
                <div>
                  <h4 class="cart-item-title">${item.name}</h4>
                  <div class="cart-item-variant">SIZE: <span>${item.size}</span></div>
                </div>
                <button class="cart-item-remove" onclick="window.soulCart.removeItem('${item.id}', '${item.size}')" title="Remove Item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div class="cart-item-footer">
                <div class="cart-qty-control">
                  <button type="button" class="qty-btn" onclick="window.soulCart.updateQuantity('${item.id}', '${item.size}', -1)">-</button>
                  <span class="qty-val">${item.quantity}</span>
                  <button type="button" class="qty-btn" onclick="window.soulCart.updateQuantity('${item.id}', '${item.size}', 1)">+</button>
                </div>
                <div class="cart-item-price">${formatCurrency(item.price * item.quantity)}</div>
              </div>
            </div>
          </div>
        `
          )
          .join("");
      }
      if (emptyState) emptyState.style.display = "none";
      if (footerContainer) footerContainer.style.display = "block";
    }
  }

  showToast(message) {
    const toast = document.getElementById("soulToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove("visible");
    }, 3200);
  }
}

// Global cart instance
document.addEventListener("DOMContentLoaded", () => {
  window.soulCart = new SoulCart();
});
