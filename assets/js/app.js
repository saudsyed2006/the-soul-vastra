/**
 * THE SOUL VASTRA - Main Application Script
 * Interactive Luxury E-Commerce Experience
 */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initIntroSection();
  initProductShowcase();
  initShopCatalog();
  initPrintsCarousel();
  initModals();
  initAccordions();
  initNewsletter();
  initScrollAnimations();
  hydrateLiveCatalog();
});

/* ==================================================
   1. NAVBAR & MOBILE MENU
   ================================================== */
function initNavbar() {
  const header = document.getElementById("mainHeader");
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const mobileNav = document.getElementById("mobileNavOverlay");
  const mobileClose = document.getElementById("mobileNavClose");
  const mobileLinks = document.querySelectorAll(".mobile-nav-link");

  // Scroll effect on header
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  // Mobile menu open / close
  function openMobileNav() {
    if (mobileNav) {
      mobileNav.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  function closeMobileNav() {
    if (mobileNav) {
      mobileNav.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  if (mobileToggle) mobileToggle.addEventListener("click", openMobileNav);
  if (mobileClose) mobileClose.addEventListener("click", closeMobileNav);
  mobileLinks.forEach((link) => link.addEventListener("click", closeMobileNav));
}

/* ==================================================
   2. INTRO ENTRY SECTION & SMOOTH SCROLL
   ================================================== */
function initIntroSection() {
  const introSection = document.getElementById("introSection");
  const enterBtn = document.getElementById("enterSiteBtn");
  const scrollIndicator = document.getElementById("scrollIndicator");

  function scrollToHero() {
    const hero = document.getElementById("hero");
    if (hero) {
      hero.scrollIntoView({ behavior: "smooth" });
    }
  }

  if (enterBtn) {
    enterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToHero();
    });
  }

  if (scrollIndicator) {
    scrollIndicator.addEventListener("click", (e) => {
      e.preventDefault();
      const nextSec = document.getElementById("collections");
      if (nextSec) {
        nextSec.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // Back to top button
  const backToTopBtn = document.getElementById("backToTopBtn");
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

/* ==================================================
   3. PRODUCT SHOWCASE (DAWN OF DISCIPLINE)
   ================================================== */
function initProductShowcase() {
  const mainImg = document.getElementById("showcaseMainImg");
  const thumbs = document.querySelectorAll(".showcase-thumb");
  const sizeBtns = document.querySelectorAll(".showcase-size-btn");
  const qtyMinus = document.getElementById("showcaseQtyMinus");
  const qtyPlus = document.getElementById("showcaseQtyPlus");
  const qtyVal = document.getElementById("showcaseQtyVal");
  const addBtn = document.getElementById("showcaseAddToCart");
  const imgZoomContainer = document.querySelector(".showcase-img-wrap");

  let selectedSize = "M";
  let quantity = 1;
  const productId = "dawn-of-discipline";

  // Thumbnail switching
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      thumbs.forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
      const newSrc = thumb.getAttribute("data-src");
      if (mainImg && newSrc) {
        mainImg.style.opacity = "0.4";
        setTimeout(() => {
          mainImg.src = newSrc;
          mainImg.style.opacity = "1";
        }, 150);
      }
    });
  });

  // Image zoom on hover / mousemove
  if (imgZoomContainer && mainImg) {
    imgZoomContainer.addEventListener("mousemove", (e) => {
      const rect = imgZoomContainer.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      mainImg.style.transformOrigin = `${x}% ${y}%`;
      mainImg.style.transform = "scale(1.5)";
    });

    imgZoomContainer.addEventListener("mouseleave", () => {
      mainImg.style.transformOrigin = "center center";
      mainImg.style.transform = "scale(1)";
    });
  }

  // Size buttons
  sizeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      sizeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedSize = btn.getAttribute("data-size");
    });
  });

  // Quantity controls
  if (qtyMinus && qtyPlus && qtyVal) {
    qtyMinus.addEventListener("click", () => {
      if (quantity > 1) {
        quantity--;
        qtyVal.textContent = quantity;
      }
    });
    qtyPlus.addEventListener("click", () => {
      quantity++;
      qtyVal.textContent = quantity;
    });
  }

  // Add to cart
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      if (window.soulCart) {
        window.soulCart.addItem(productId, selectedSize, quantity);
        // Visual button feedback
        const origText = addBtn.innerHTML;
        addBtn.innerHTML = `ADDED TO BAG <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        addBtn.classList.add("btn-success");
        setTimeout(() => {
          addBtn.innerHTML = origText;
          addBtn.classList.remove("btn-success");
        }, 1800);
      }
    });
  }

  window.updateProductShowcase = function (product) {
    if (!product) return;
    const priceEl = document.querySelector(".showcase-price");
    const origPriceEl = document.querySelector(".showcase-orig-price");
    const titleEl = document.querySelector(".showcase-product-title");
    const tagEl = document.querySelector(".showcase-category-tag");
    const descEl = document.querySelector(".showcase-desc");

    if (priceEl) priceEl.textContent = formatCurrency(product.price);
    if (origPriceEl) {
      if (product.originalPrice) {
        origPriceEl.textContent = formatCurrency(product.originalPrice);
        origPriceEl.style.display = "inline";
      } else {
        origPriceEl.style.display = "none";
      }
    }
    if (titleEl) titleEl.textContent = product.name;
    if (tagEl) tagEl.textContent = product.subtitle || product.categoryLabel;
    if (descEl && product.description) descEl.textContent = product.description;
  };
}

/* ==================================================
   4. SHOP CATALOG & FILTERING
   ================================================== */
function initShopCatalog() {
  const gridContainer = document.getElementById("shopProductGrid");
  const filterBtns = document.querySelectorAll(".shop-filter-btn");

  if (!gridContainer) return;

  function renderGrid(filter = "ALL") {
    const list = window.SOUL_PRODUCTS || SOUL_PRODUCTS;
    let filtered = list;
    if (filter === "OVERSIZED") {
      filtered = list.filter((p) => p.category === "OVERSIZED");
    } else if (filter === "ROUND NECK") {
      filtered = list.filter((p) => p.category === "ROUND NECK");
    } else if (filter === "NEW ARRIVALS") {
      filtered = list.filter((p) => (p.tags || []).includes("NEW ARRIVALS"));
    } else if (filter === "BEST SELLERS") {
      filtered = list.filter((p) => (p.tags || []).includes("BEST SELLERS"));
    }

    gridContainer.innerHTML = filtered
      .map(
        (product) => `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-card-image-wrap">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
          ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ""}
          <button class="product-wishlist-btn ${window.soulCart && window.soulCart.isWishlisted(product.id) ? "active" : ""}" data-wishlist-id="${product.id}" title="Save to Wishlist">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          <div class="product-card-hover-actions">
            <button class="btn-quick-add" onclick="window.quickAddToCart('${product.id}')">
              QUICK ADD
            </button>
            <button class="btn-quick-view" onclick="window.openQuickView('${product.id}')">
              VIEW DETAILS
            </button>
          </div>
        </div>
        <div class="product-card-info" onclick="window.openQuickView('${product.id}')">
          <div class="product-card-category">${product.categoryLabel}</div>
          <h3 class="product-card-title">${product.name}</h3>
          <div class="product-card-price-row">
            <span class="product-card-price">${formatCurrency(product.price)}</span>
            ${product.originalPrice ? `<span class="product-card-orig-price">${formatCurrency(product.originalPrice)}</span>` : ""}
          </div>
        </div>
      </div>
    `
      )
      .join("");

    // Attach wishlist listener
    gridContainer.querySelectorAll(".product-wishlist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-wishlist-id");
        if (window.soulCart) {
          const isFav = window.soulCart.toggleWishlist(id);
          btn.classList.toggle("active", isFav);
        }
      });
    });
  }

  // Filter buttons click
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.getAttribute("data-filter");
      renderGrid(filter);
    });
  });

  // Initial render
  renderGrid("ALL");
  window.renderShopGrid = renderGrid;
}

/* ==================================================
   5. "ALL PRINTS. ALL STORIES." CAROUSEL
   ================================================== */
function initPrintsCarousel() {
  const track = document.getElementById("printsTrack");
  const prevBtn = document.getElementById("printsPrevBtn");
  const nextBtn = document.getElementById("printsNextBtn");

  if (!track) return;

  const scrollAmount = 320;

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
  }

  // Drag-to-scroll support for desktop
  let isDown = false;
  let startX;
  let scrollLeft;

  track.addEventListener("mousedown", (e) => {
    isDown = true;
    track.classList.add("dragging");
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  });

  track.addEventListener("mouseleave", () => {
    isDown = false;
    track.classList.remove("dragging");
  });

  track.addEventListener("mouseup", () => {
    isDown = false;
    track.classList.remove("dragging");
  });

  track.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1.5;
    track.scrollLeft = scrollLeft - walk;
  });
}

/* ==================================================
   6. QUICK VIEW & SIZE GUIDE MODALS
   ================================================== */
function initModals() {
  const modal = document.getElementById("quickViewModal");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalClose = document.getElementById("quickViewClose");

  const sizeGuideModal = document.getElementById("sizeGuideModal");
  const sizeGuideClose = document.getElementById("sizeGuideClose");
  const sizeGuideTriggers = document.querySelectorAll(".trigger-size-guide");

  function closeModal() {
    if (modal) modal.classList.remove("active");
    if (sizeGuideModal) sizeGuideModal.classList.remove("active");
    if (modalBackdrop) modalBackdrop.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (sizeGuideClose) sizeGuideClose.addEventListener("click", closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Size Guide trigger
  sizeGuideTriggers.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (sizeGuideModal && modalBackdrop) {
        sizeGuideModal.classList.add("active");
        modalBackdrop.classList.add("active");
        document.body.style.overflow = "hidden";
      }
    });
  });

  // Size Guide unit toggle (Inches vs CM)
  const unitBtns = document.querySelectorAll(".unit-toggle-btn");
  unitBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      unitBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const unit = btn.getAttribute("data-unit");
      document.querySelectorAll(".measure-val").forEach((el) => {
        const val = el.getAttribute(`data-${unit}`);
        if (val) el.textContent = val;
      });
    });
  });

  // Global helper to open quick view
  window.openQuickView = function (productId) {
    const catalog = window.SOUL_PRODUCTS || SOUL_PRODUCTS;
    const product = catalog.find((p) => p.id === productId);
    if (!product || !modal) return;

    let selectedSize = "M";
    let quantity = 1;

    const modalBody = document.getElementById("quickViewContent");
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="qv-grid">
          <div class="qv-gallery">
            <div class="qv-main-image">
              <img id="qvMainImg" src="${product.image}" alt="${product.name}" />
            </div>
            ${
              product.gallery && product.gallery.length > 1
                ? `<div class="qv-thumbs">
                    ${product.gallery
                      .map(
                        (g, idx) => `
                        <div class="qv-thumb ${idx === 0 ? "active" : ""}" onclick="window.switchQvImage('${g}', this)">
                          <img src="${g}" alt="${product.name} view ${idx + 1}" />
                        </div>
                      `
                      )
                      .join("")}
                   </div>`
                : ""
            }
          </div>
          <div class="qv-info">
            <div class="qv-category">${product.categoryLabel} &bull; ${product.collection} DROP</div>
            <h2 class="qv-title">${product.name}</h2>
            <div class="qv-price-row">
              <span class="qv-price">${formatCurrency(product.price)}</span>
              ${product.originalPrice ? `<span class="qv-orig-price">${formatCurrency(product.originalPrice)}</span>` : ""}
              <span class="qv-tax-tag">Inclusive of all taxes</span>
            </div>
            <p class="qv-desc">${product.description}</p>
            <div class="qv-story-quote">&ldquo;${product.story}&rdquo;</div>

            <div class="qv-options">
              <div class="qv-option-header">
                <span class="qv-option-label">SELECT SIZE</span>
                <button type="button" class="qv-size-guide-link trigger-size-guide" onclick="window.openSizeGuideModal()">Size Guide</button>
              </div>
              <div class="qv-sizes" id="qvSizesContainer">
                ${product.sizes
                  .map(
                    (s) => `
                  <button type="button" class="size-choice-btn ${s === "M" ? "active" : ""}" data-size="${s}" onclick="window.selectQvSize('${s}', this)">${s}</button>
                `
                  )
                  .join("")}
              </div>
            </div>

            <div class="qv-qty-row">
              <div class="qv-qty-selector">
                <button type="button" class="qty-btn" onclick="window.changeQvQty(-1)">-</button>
                <span id="qvQtyDisplay">1</span>
                <button type="button" class="qty-btn" onclick="window.changeQvQty(1)">+</button>
              </div>
              <button type="button" class="btn-primary qv-add-btn" id="qvAddToCartBtn" onclick="window.confirmQvAdd('${product.id}')">
                ADD TO CART &bull; ${formatCurrency(product.price)}
              </button>
            </div>

            <div class="qv-spec-list">
              <div class="qv-spec-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <span><strong>Fabric:</strong> ${product.fabric}</span>
              </div>
              <div class="qv-spec-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                <span><strong>Fit:</strong> ${product.fit}</span>
              </div>
              <div class="qv-spec-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span><strong>Dispatch:</strong> Within 24 Hours &bull; Free Shipping above ₹1,499</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    window.qvCurrentState = {
      productId: product.id,
      selectedSize: "M",
      quantity: 1,
      price: product.price
    };

    modal.classList.add("active");
    if (modalBackdrop) modalBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  // Helper functions for modal bindings
  window.switchQvImage = function (src, el) {
    const qvImg = document.getElementById("qvMainImg");
    if (qvImg) qvImg.src = src;
    document.querySelectorAll(".qv-thumb").forEach((t) => t.classList.remove("active"));
    if (el) el.classList.add("active");
  };

  window.selectQvSize = function (size, el) {
    if (window.qvCurrentState) {
      window.qvCurrentState.selectedSize = size;
    }
    document.querySelectorAll(".size-choice-btn").forEach((b) => b.classList.remove("active"));
    if (el) el.classList.add("active");
  };

  window.changeQvQty = function (delta) {
    if (!window.qvCurrentState) return;
    let newQty = window.qvCurrentState.quantity + delta;
    if (newQty < 1) newQty = 1;
    window.qvCurrentState.quantity = newQty;
    const disp = document.getElementById("qvQtyDisplay");
    if (disp) disp.textContent = newQty;
    const addBtn = document.getElementById("qvAddToCartBtn");
    if (addBtn) {
      addBtn.innerHTML = `ADD TO CART &bull; ${formatCurrency(window.qvCurrentState.price * newQty)}`;
    }
  };

  window.confirmQvAdd = function (productId) {
    if (!window.qvCurrentState) return;
    if (window.soulCart) {
      window.soulCart.addItem(
        productId,
        window.qvCurrentState.selectedSize,
        window.qvCurrentState.quantity
      );
      closeModal();
    }
  };

  window.quickAddToCart = function (productId) {
    if (window.soulCart) {
      window.soulCart.addItem(productId, "M", 1);
    }
  };

  window.openSizeGuideModal = function () {
    if (sizeGuideModal && modalBackdrop) {
      sizeGuideModal.classList.add("active");
      modalBackdrop.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  };
}

/* ==================================================
   7. ACCORDION INTERACTIONS
   ================================================== */
function initAccordions() {
  const accordionHeaders = document.querySelectorAll(".accordion-header");

  accordionHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains("active");

      // Close sibling accordions if within the same accordion group
      const parent = item.parentElement;
      if (parent) {
        parent.querySelectorAll(".accordion-item").forEach((sib) => {
          sib.classList.remove("active");
        });
      }

      if (!isOpen) {
        item.classList.add("active");
      }
    });
  });
}

/* ==================================================
   8. NEWSLETTER SUBSCRIPTION
   ================================================== */
function initNewsletter() {
  const form = document.getElementById("newsletterForm");
  const input = document.getElementById("newsletterEmail");

  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = input.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        if (window.soulCart) {
          window.soulCart.showToast("Please enter a valid email address");
        }
        return;
      }

      if (window.soulCart) {
        window.soulCart.showToast("Welcome to the Vanguard. You will receive private drop alerts.");
      }
      input.value = "";
    });
  }
}

/* ==================================================
   9. SCROLL REVEAL ANIMATIONS
   ================================================== */
function initScrollAnimations() {
  document.body.classList.add("js-reveal-active");
  const revealElements = document.querySelectorAll(".reveal-on-scroll");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  revealElements.forEach((el) => observer.observe(el));
}

/* ==================================================
   10. LIVE DATABASE CATALOG & HOMEPAGE HYDRATION
   ================================================== */
async function hydrateLiveCatalog() {
  // 1. Fetch live products from backend database
  try {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        window.SOUL_PRODUCTS = data.products;

        // Update Dawn of Discipline Spotlight Showcase
        const dawn = data.products.find((p) => p.id === "dawn-of-discipline");
        if (dawn && window.updateProductShowcase) {
          window.updateProductShowcase(dawn);
        }

        // Re-render shop catalog with database records
        if (window.renderShopGrid) {
          window.renderShopGrid("ALL");
        }

        // Update Prints Carousel prices
        data.products.forEach((p) => {
          const card = document.querySelector(`.print-card[data-print-id="${p.id}"]`);
          if (card) {
            const priceEl = card.querySelector(".print-price");
            if (priceEl) priceEl.textContent = formatCurrency(p.price);
          }
        });
      }
    }
  } catch (err) {
    // Local static fallback
    console.log("[The Soul Vastra] Operating in local fallback mode.");
  }

  // 2. Fetch live homepage editorial config
  try {
    const res = await fetch("/api/homepage");
    if (res.ok) {
      const data = await res.json();
      if (data.config) {
        const c = data.config;
        if (c.hero) {
          const eyebrow = document.querySelector(".eyebrow-text, .eyebrow-jp");
          const heroEyebrowText = c.hero.eyebrow || c.hero.eyebrow_text || c.hero.eyebrow_jp || "WEAR YOUR LEGACY.";
          if (eyebrow) {
            eyebrow.textContent = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(heroEyebrowText)
              ? "WEAR YOUR LEGACY."
              : heroEyebrowText;
          }
          const heroTitleSpans = document.querySelectorAll(".hero-title span");
          if (heroTitleSpans.length >= 3) {
            if (c.hero.title_line1) heroTitleSpans[0].textContent = c.hero.title_line1;
            if (c.hero.title_line2) heroTitleSpans[1].textContent = c.hero.title_line2;
            if (c.hero.title_line3) heroTitleSpans[2].textContent = c.hero.title_line3;
          }
          const subtitle = document.querySelector(".hero-subtitle");
          if (subtitle && c.hero.subtitle) subtitle.textContent = c.hero.subtitle;
          const btn1 = document.querySelector(".hero-cta-group .btn-primary");
          if (btn1 && c.hero.cta_oversized_text) btn1.textContent = c.hero.cta_oversized_text;
          const btn2 = document.querySelector(".hero-cta-group .btn-secondary");
          if (btn2 && c.hero.cta_roundneck_text) btn2.textContent = c.hero.cta_roundneck_text;
        }
        if (c.story) {
          const storyHeading = document.querySelector(".story-title");
          if (storyHeading && c.story.heading) storyHeading.textContent = c.story.heading;
          const storyPs = document.querySelectorAll(".story-text p");
          if (storyPs.length >= 2) {
            if (c.story.p1) storyPs[0].textContent = c.story.p1;
            if (c.story.p2) storyPs[1].textContent = c.story.p2;
          }
        }
        if (c.philosophy) {
          const philoHeading = document.querySelector(".philosophy-title");
          if (philoHeading && c.philosophy.heading) philoHeading.textContent = c.philosophy.heading;
        }
      }
    }
  } catch (err) {
    // Local static fallback
  }

  // 3. Fetch live collections
  try {
    const res = await fetch("/api/collections");
    if (res.ok) {
      const data = await res.json();
      if (data.collections && data.collections.length > 0) {
        data.collections.forEach((col) => {
          const colCard = document.querySelector(`.collection-card[data-collection="${col.name}"]`);
          if (colCard) {
            const sub = colCard.querySelector(".collection-category");
            if (sub && col.subtitle) sub.textContent = col.subtitle;
          }
        });
      }
    }
  } catch (err) {
    // Local static fallback
  }
}

