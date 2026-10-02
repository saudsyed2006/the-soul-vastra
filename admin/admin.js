/**
 * THE SOUL VASTRA - Admin Dashboard Controller
 * Pure server-authenticated administration system
 */

let currentProducts = [];
let currentCollections = [];
let isEditingProduct = false;

document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  initNavigation();
  initModals();
  initMediaUploader();
  initHomepageForm();
  initPasswordForm();

  // Load initial tab from hash or default to dashboard
  const hash = window.location.hash.replace("#", "") || "dashboard";
  switchTab(hash);
});

// -------------------------------------------------------------
// 1. Authentication Check & Identity
// -------------------------------------------------------------
async function checkAuth() {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();

    if (!data.authenticated || !data.user || data.user.role !== "owner") {
      window.location.href = "/admin/login";
      return;
    }

    const emailDisp = document.getElementById("ownerEmailDisplay");
    if (emailDisp && data.user.email) {
      emailDisp.textContent = data.user.email;
    }
  } catch (e) {
    window.location.href = "/admin/login";
  }

  // Logout listener
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        window.location.href = "/admin/login";
      }
    });
  }
}

// -------------------------------------------------------------
// 2. Navigation & Tabs
// -------------------------------------------------------------
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const tab = item.getAttribute("data-tab");
      switchTab(tab);
    });
  });

  // Mobile menu toggle
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("adminSidebar");
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }
}

window.switchTab = function (tab) {
  window.location.hash = tab;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.getAttribute("data-tab") === tab);
  });

  document.querySelectorAll(".admin-tab-view").forEach((view) => {
    view.style.display = "none";
  });

  const activeView = document.getElementById(`view-${tab}`);
  if (activeView) activeView.style.display = "block";

  const heading = document.getElementById("pageTitleHeading");
  if (heading) heading.textContent = tab.toUpperCase().replace("-", " ");

  // Load view data
  if (tab === "dashboard") loadDashboardStats();
  if (tab === "products") loadProducts();
  if (tab === "collections") loadCollections();
  if (tab === "homepage") loadHomepageConfig();
  if (tab === "media") loadMediaLibrary();
  if (tab === "audit") loadAuditLogs();
};

function showToast(message, isError = false) {
  const toast = document.getElementById("adminToast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `alert-box ${isError ? "error" : "success"}`;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3500);
}

// -------------------------------------------------------------
// 3. Dashboard View
// -------------------------------------------------------------
async function loadDashboardStats() {
  try {
    const res = await fetch("/api/admin/dashboard-stats");
    const data = await res.json();
    if (!data.success) return;

    const s = data.stats;
    document.getElementById("metricTotalProducts").textContent = s.total_products;
    document.getElementById("metricActiveProducts").textContent = s.active_products;
    document.getElementById("metricOutOfStock").textContent = s.out_of_stock;
    document.getElementById("metricCollections").textContent = s.active_collections;

    const tbody = document.getElementById("dashboardRecentLogsBody");
    if (tbody && s.recent_audit_logs) {
      if (s.recent_audit_logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-dim);">No mutations recorded yet.</td></tr>`;
      } else {
        tbody.innerHTML = s.recent_audit_logs.map((log) => renderAuditRow(log)).join("");
      }
    }
  } catch (e) {
    console.error("Failed to load dashboard stats", e);
  }
}

// -------------------------------------------------------------
// 4. Products Management
// -------------------------------------------------------------
async function loadProducts() {
  const tbody = document.getElementById("productsTableBody");
  try {
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="9" style="color:red; text-align:center;">Failed to load catalogue.</td></tr>`;
      return;
    }
    currentProducts = data.products || [];
    renderProductsTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:red; text-align:center;">Network error loading products.</td></tr>`;
  }
}

function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");
  const filterCat = document.getElementById("prodCategoryFilter").value;
  const search = (document.getElementById("prodSearchInput").value || "").toLowerCase().trim();

  let filtered = currentProducts;
  if (filterCat !== "ALL") {
    filtered = filtered.filter((p) => (p.category || "").toUpperCase() === filterCat.toUpperCase());
  }
  if (search) {
    filtered = filtered.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(search) ||
        (p.collection || "").toLowerCase().includes(search) ||
        (p.category || "").toLowerCase().includes(search)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--text-dim);">No products match filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((p) => {
      let statusClass = p.is_active ? "active" : "draft";
      let statusText = p.is_active ? "ACTIVE" : "DRAFT";
      if (p.stock_quantity <= 0) {
        statusClass = "out-of-stock";
        statusText = "OUT OF STOCK";
      }

      return `
        <tr>
          <td class="prod-thumb-cell">
            <img src="${p.image || '/assets/images/hero-street-samurai.jpg'}" alt="${p.name}" />
          </td>
          <td>
            <div class="prod-name-title">${p.name}</div>
            <div class="prod-name-sub">${p.subtitle || p.id}</div>
          </td>
          <td>${p.category || '--'}</td>
          <td><span style="color:var(--crimson-bright); font-weight:600;">${p.collection || '--'}</span></td>
          <td style="font-weight:700; color:#ffffff;">₹${Number(p.price).toLocaleString("en-IN")}</td>
          <td style="color:var(--text-dim); text-decoration:${p.original_price ? 'line-through' : 'none'};">
            ${p.original_price ? '₹' + Number(p.original_price).toLocaleString("en-IN") : '--'}
          </td>
          <td>${p.stock_quantity}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn-icon-action" title="Edit Product" onclick="window.openEditProduct('${p.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button type="button" class="btn-icon-action" title="Duplicate Product" onclick="window.duplicateProduct('${p.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button type="button" class="btn-icon-action delete" title="Delete Product" onclick="window.deleteProduct('${p.id}', '${p.name}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// -------------------------------------------------------------
// 5. Product Editor Modal & Actions
// -------------------------------------------------------------
function initModals() {
  const prodModal = document.getElementById("productModal");
  const closeProd = document.getElementById("closeProductModal");
  const cancelProd = document.getElementById("cancelProductBtn");
  const saveProd = document.getElementById("saveProductBtn");
  const openAdd = document.getElementById("openAddProductModal");

  openAdd.addEventListener("click", () => {
    isEditingProduct = false;
    document.getElementById("productModalTitle").textContent = "ADD NEW PRODUCT";
    document.getElementById("productEditForm").reset();
    document.getElementById("p_id").value = "";
    document.getElementById("p_image_preview").src = "/assets/images/hero-street-samurai.jpg";
    prodModal.style.display = "flex";
  });

  const closeModal = () => (prodModal.style.display = "none");
  closeProd.addEventListener("click", closeModal);
  cancelProd.addEventListener("click", closeModal);

  // Live image preview input listener
  const imgInput = document.getElementById("p_image");
  const imgPreview = document.getElementById("p_image_preview");
  imgInput.addEventListener("input", () => {
    imgPreview.src = imgInput.value.trim() || "/assets/images/hero-street-samurai.jpg";
  });

  // Modal Image Upload Button
  const uploadTrigger = document.getElementById("triggerProdImageUpload");
  const fileInput = document.getElementById("prodImageFileInput");
  uploadTrigger.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    uploadTrigger.textContent = "Uploading...";
    try {
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        imgInput.value = data.url;
        imgPreview.src = data.url;
        showToast("Image uploaded and linked to product!");
      } else {
        showToast(data.error || "Upload failed", true);
      }
    } catch (e) {
      showToast("Upload network error", true);
    } finally {
      uploadTrigger.textContent = "Upload New";
    }
  });

  // Save Product
  saveProd.addEventListener("click", async () => {
    const id = document.getElementById("p_id").value.trim();
    const name = document.getElementById("p_name").value.trim();
    const slug = document.getElementById("p_slug").value.trim();
    const price = parseFloat(document.getElementById("p_price").value);
    const origPriceVal = document.getElementById("p_original_price").value.trim();
    const origPrice = origPriceVal ? parseFloat(origPriceVal) : null;
    const stock = parseInt(document.getElementById("p_stock").value, 10) || 0;

    if (!name || isNaN(price)) {
      alert("Please provide a valid Product Name and Price.");
      return;
    }

    const sizes = Array.from(document.querySelectorAll("#sizesCheckboxes input:checked")).map((cb) => cb.value);

    const payload = {
      name,
      slug,
      subtitle: document.getElementById("p_subtitle").value.trim(),
      category: document.getElementById("p_category").value,
      category_label: document.getElementById("p_category").value === "OVERSIZED" ? "Oversized T-Shirt" : "Round Neck T-Shirt",
      collection: document.getElementById("p_collection").value,
      price,
      original_price: origPrice,
      stock_quantity: stock,
      image: document.getElementById("p_image").value.trim() || "assets/images/hero-street-samurai.jpg",
      is_active: document.getElementById("p_status").value === "1",
      is_featured: document.getElementById("p_featured").checked,
      description: document.getElementById("p_description").value.trim(),
      story: document.getElementById("p_story").value.trim(),
      fabric: document.getElementById("p_fabric").value.trim(),
      fit: document.getElementById("p_fit").value.trim(),
      sizes
    };

    saveProd.disabled = true;
    saveProd.textContent = "SAVING...";

    try {
      const url = isEditingProduct ? `/api/admin/products/${id}` : "/api/admin/products";
      const method = isEditingProduct ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(isEditingProduct ? "Product & prices updated in database!" : "New product published!");
        closeModal();
        await loadProducts();
      } else {
        showToast(data.error || "Failed to save product", true);
      }
    } catch (e) {
      showToast("Error communicating with server", true);
    } finally {
      saveProd.disabled = false;
      saveProd.textContent = "SAVE PRODUCT";
    }
  });

  // Filter Listeners
  document.getElementById("prodCategoryFilter").addEventListener("change", renderProductsTable);
  document.getElementById("prodSearchInput").addEventListener("input", renderProductsTable);
}

window.openEditProduct = function (id) {
  const p = currentProducts.find((item) => item.id === id);
  if (!p) return;

  isEditingProduct = true;
  document.getElementById("productModalTitle").textContent = `EDIT PRODUCT: ${p.name}`;
  document.getElementById("p_id").value = p.id;
  document.getElementById("p_name").value = p.name;
  document.getElementById("p_slug").value = p.slug || p.id;
  document.getElementById("p_subtitle").value = p.subtitle || "";
  document.getElementById("p_category").value = p.category || "OVERSIZED";
  document.getElementById("p_collection").value = p.collection || "ECLIPSE";
  document.getElementById("p_price").value = p.price;
  document.getElementById("p_original_price").value = p.original_price || "";
  document.getElementById("p_stock").value = p.stock_quantity || 0;
  document.getElementById("p_image").value = p.image || "";
  document.getElementById("p_image_preview").src = p.image || "/assets/images/hero-street-samurai.jpg";
  document.getElementById("p_status").value = p.is_active ? "1" : "0";
  document.getElementById("p_featured").checked = !!p.is_featured;
  document.getElementById("p_description").value = p.description || "";
  document.getElementById("p_story").value = p.story || "";
  document.getElementById("p_fabric").value = p.fabric || "";
  document.getElementById("p_fit").value = p.fit || "";

  const sizes = p.sizes || [];
  document.querySelectorAll("#sizesCheckboxes input").forEach((cb) => {
    cb.checked = sizes.includes(cb.value);
  });

  document.getElementById("productModal").style.display = "flex";
};

window.duplicateProduct = async function (id) {
  if (!confirm("Duplicate this product as a new draft?")) return;
  try {
    const res = await fetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Product duplicated as draft!");
      await loadProducts();
    } else {
      showToast(data.error || "Duplication failed", true);
    }
  } catch (e) {
    showToast("Network error during duplication", true);
  }
};

window.deleteProduct = async function (id, name) {
  if (!confirm(`Are you sure you want to permanently delete "${name}" from the database?`)) return;
  try {
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Product "${name}" deleted from database!`);
      await loadProducts();
    } else {
      showToast(data.error || "Deletion failed", true);
    }
  } catch (e) {
    showToast("Network error deleting product", true);
  }
};

// -------------------------------------------------------------
// 6. Collections Management
// -------------------------------------------------------------
async function loadCollections() {
  const grid = document.getElementById("collectionsGrid");
  try {
    const res = await fetch("/api/admin/collections");
    const data = await res.json();
    if (!data.success) return;
    currentCollections = data.collections || [];

    grid.innerHTML = currentCollections
      .map(
        (col) => `
        <div class="metric-card" style="padding:0; overflow:hidden;">
          <div style="height:150px; position:relative; overflow:hidden;">
            <img src="${col.image}" alt="${col.name}" style="width:100%; height:100%; object-fit:cover;" />
            <span class="status-badge active" style="position:absolute; top:10px; right:10px;">${col.badge || 'ACTIVE'}</span>
          </div>
          <div style="padding:1.2rem;">
            <div class="prod-name-title" style="font-size:1.1rem;">${col.name}</div>
            <div style="font-size:0.75rem; color:var(--crimson-bright); margin-bottom:0.5rem;">${col.subtitle || ''}</div>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">${col.description || 'No description'}</p>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; color:var(--text-dim);">${col.product_count || 0} Products</span>
              <button type="button" class="btn-secondary-action" style="padding:0.4rem 0.8rem;" onclick="window.openEditCollection('${col.id}')">Edit</button>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  } catch (e) {
    console.error("Failed to load collections", e);
  }
}

const colModal = document.getElementById("collectionModal");
const closeCol = document.getElementById("closeColModal");
const cancelCol = document.getElementById("cancelColBtn");
const saveCol = document.getElementById("saveColBtn");
const openAddCol = document.getElementById("openAddCollectionModal");

if (openAddCol) {
  openAddCol.addEventListener("click", () => {
    document.getElementById("colModalTitle").textContent = "CREATE COLLECTION";
    document.getElementById("colForm").reset();
    document.getElementById("col_id").value = "";
    colModal.style.display = "flex";
  });
}
if (closeCol) closeCol.addEventListener("click", () => (colModal.style.display = "none"));
if (cancelCol) cancelCol.addEventListener("click", () => (colModal.style.display = "none"));

window.openEditCollection = function (id) {
  const c = currentCollections.find((item) => item.id === id);
  if (!c) return;
  document.getElementById("colModalTitle").textContent = `EDIT COLLECTION: ${c.name}`;
  document.getElementById("col_id").value = c.id;
  document.getElementById("col_name").value = c.name;
  document.getElementById("col_subtitle").value = c.subtitle || "";
  document.getElementById("col_description").value = c.description || "";
  document.getElementById("col_image").value = c.image || "";
  colModal.style.display = "flex";
};

if (saveCol) {
  saveCol.addEventListener("click", async () => {
    const id = document.getElementById("col_id").value.trim();
    const name = document.getElementById("col_name").value.trim();
    if (!name) return alert("Collection name is required.");

    const payload = {
      name,
      subtitle: document.getElementById("col_subtitle").value.trim(),
      description: document.getElementById("col_description").value.trim(),
      image: document.getElementById("col_image").value.trim()
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/admin/collections/${id}` : "/api/admin/collections";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Collection saved!");
      colModal.style.display = "none";
      await loadCollections();
    } else {
      showToast(data.error || "Failed to save collection", true);
    }
  });
}

// -------------------------------------------------------------
// 7. Homepage Content Editor
// -------------------------------------------------------------
async function loadHomepageConfig() {
  try {
    const res = await fetch("/api/admin/homepage");
    const data = await res.json();
    if (!data.success || !data.config) return;

    const c = data.config;
    if (c.hero) {
      document.getElementById("hp_hero_eyebrow").value = c.hero.eyebrow || c.hero.eyebrow_text || c.hero.eyebrow_jp || "WEAR YOUR LEGACY.";
      document.getElementById("hp_hero_title1").value = c.hero.title_line1 || "";
      document.getElementById("hp_hero_title2").value = c.hero.title_line2 || "";
      document.getElementById("hp_hero_title3").value = c.hero.title_line3 || "";
      document.getElementById("hp_hero_subtitle").value = c.hero.subtitle || "";
      document.getElementById("hp_hero_cta1").value = c.hero.cta_oversized_text || "";
      document.getElementById("hp_hero_cta2").value = c.hero.cta_roundneck_text || "";
    }
    if (c.story) {
      document.getElementById("hp_story_heading").value = c.story.heading || "";
      document.getElementById("hp_story_p1").value = c.story.p1 || "";
      document.getElementById("hp_story_p2").value = c.story.p2 || "";
    }
    if (c.philosophy) {
      document.getElementById("hp_philo_heading").value = c.philosophy.heading || "";
      document.getElementById("hp_philo_p1").value = c.philosophy.p1 || "";
    }
  } catch (e) {
    console.error("Failed to load homepage config", e);
  }
}

function initHomepageForm() {
  const form = document.getElementById("homepageForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      hero: {
        eyebrow: document.getElementById("hp_hero_eyebrow").value.trim(),
        eyebrow_jp: document.getElementById("hp_hero_eyebrow").value.trim(),
        title_line1: document.getElementById("hp_hero_title1").value.trim(),
        title_line2: document.getElementById("hp_hero_title2").value.trim(),
        title_line3: document.getElementById("hp_hero_title3").value.trim(),
        subtitle: document.getElementById("hp_hero_subtitle").value.trim(),
        cta_oversized_text: document.getElementById("hp_hero_cta1").value.trim(),
        cta_roundneck_text: document.getElementById("hp_hero_cta2").value.trim()
      },
      story: {
        heading: document.getElementById("hp_story_heading").value.trim(),
        p1: document.getElementById("hp_story_p1").value.trim(),
        p2: document.getElementById("hp_story_p2").value.trim()
      },
      philosophy: {
        heading: document.getElementById("hp_philo_heading").value.trim(),
        p1: document.getElementById("hp_philo_p1").value.trim()
      }
    };

    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Homepage editorial copy updated live!");
      } else {
        showToast(data.error || "Update failed", true);
      }
    } catch (err) {
      showToast("Network error updating homepage", true);
    }
  });
}

// -------------------------------------------------------------
// 8. Media Library
// -------------------------------------------------------------
function initMediaUploader() {
  const box = document.getElementById("mediaUploadBox");
  const input = document.getElementById("mediaFileInput");
  if (!box || !input) return;

  box.addEventListener("click", () => input.click());
  box.addEventListener("dragover", (e) => {
    e.preventDefault();
    box.style.borderColor = "var(--crimson-bright)";
  });
  box.addEventListener("dragleave", () => {
    box.style.borderColor = "var(--border-subtle)";
  });
  box.addEventListener("drop", async (e) => {
    e.preventDefault();
    box.style.borderColor = "var(--border-subtle)";
    if (e.dataTransfer.files.length > 0) {
      await uploadMediaFile(e.dataTransfer.files[0]);
    }
  });
  input.addEventListener("change", async () => {
    if (input.files.length > 0) {
      await uploadMediaFile(input.files[0]);
    }
  });
}

async function uploadMediaFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  showToast("Uploading media asset...");

  try {
    const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Media uploaded to secure server!");
      await loadMediaLibrary();
    } else {
      showToast(data.error || "Upload failed", true);
    }
  } catch (e) {
    showToast("Network error uploading file", true);
  }
}

async function loadMediaLibrary() {
  const grid = document.getElementById("mediaGrid");
  if (!grid) return;
  try {
    const res = await fetch("/api/admin/media");
    const data = await res.json();
    if (!data.success) return;

    if (!data.media || data.media.length === 0) {
      grid.innerHTML = `<p style="color:var(--text-dim); grid-column:span 3;">No media uploaded to /uploads yet.</p>`;
      return;
    }

    grid.innerHTML = data.media
      .map(
        (m) => `
        <div class="table-card" style="padding:0.8rem; text-align:center;">
          <img src="${m.url}" alt="${m.original_name}" style="width:100%; height:130px; object-fit:cover; border-radius:3px; margin-bottom:0.5rem;" />
          <div style="font-size:0.75rem; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.original_name}</div>
          <button type="button" class="btn-secondary-action" style="padding:0.3rem 0.6rem; font-size:0.7rem; margin-top:0.4rem; width:100%;" onclick="navigator.clipboard.writeText('${m.url}'); window.showToast('Copied URL to clipboard!');">Copy Path</button>
        </div>
      `
      )
      .join("");
  } catch (e) {
    console.error("Failed to load media", e);
  }
}

// -------------------------------------------------------------
// 9. Audit Logs View
// -------------------------------------------------------------
async function loadAuditLogs() {
  const tbody = document.getElementById("auditLogsFullBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/admin/audit-logs?limit=100");
    const data = await res.json();
    if (!data.success) return;

    if (!data.logs || data.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-dim);">No audit logs on record.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.logs
      .map(
        (l) => `
        <tr>
          <td>#${l.id}</td>
          <td style="font-size:0.75rem; color:var(--text-dim);">${new Date(l.timestamp).toLocaleString()}</td>
          <td><span class="status-badge ${l.action.includes('DELETED') ? 'out-of-stock' : l.action.includes('CREATED') ? 'active' : 'draft'}">${l.action}</span></td>
          <td>${l.object_type}</td>
          <td style="font-family:monospace; color:var(--crimson-bright);">${l.object_id || '--'}</td>
          <td>${l.user_email || 'owner'}</td>
          <td style="font-size:0.75rem; max-width:240px; word-break:break-all;">
            ${l.old_value_json ? `<div style="color:#ff858d;">Old: ${l.old_value_json}</div>` : ''}
            ${l.new_value_json ? `<div style="color:#4ade80;">New: ${l.new_value_json}</div>` : ''}
          </td>
          <td style="font-size:0.72rem; color:var(--text-dim);">${l.ip_address || '127.0.0.1'}</td>
        </tr>
      `
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Failed to load audit logs.</td></tr>`;
  }
}

function renderAuditRow(l) {
  return `
    <tr>
      <td style="font-size:0.75rem; color:var(--text-dim);">${new Date(l.timestamp).toLocaleTimeString()}</td>
      <td><span class="status-badge ${l.action.includes('DELETED') ? 'out-of-stock' : l.action.includes('PRICE') ? 'active' : 'draft'}">${l.action}</span></td>
      <td>${l.object_type}: <strong style="color:#fff;">${l.object_id || ''}</strong></td>
      <td>${l.user_email || 'owner'}</td>
      <td style="font-size:0.75rem;">
        ${l.action === 'PRICE_CHANGED' ? `Price updated in DB: <span style="color:#4ade80;">${l.new_value_json}</span>` : 'Catalogue mutation recorded'}
      </td>
    </tr>
  `;
}

// -------------------------------------------------------------
// 10. Settings & Password Change
// -------------------------------------------------------------
function initPasswordForm() {
  const form = document.getElementById("changePasswordForm");
  const alertBox = document.getElementById("pwdAlert");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.style.display = "none";

    const cur = document.getElementById("curPassword").value;
    const n1 = document.getElementById("newPassword").value;
    const n2 = document.getElementById("confirmNewPassword").value;

    if (n1 !== n2) {
      alertBox.textContent = "New passwords do not match.";
      alertBox.className = "alert-box error";
      alertBox.style.display = "block";
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: cur, new_password: n1 })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alertBox.textContent = "Password successfully updated!";
        alertBox.className = "alert-box success";
        alertBox.style.display = "block";
        form.reset();
      } else {
        alertBox.textContent = data.error || "Password update failed.";
        alertBox.className = "alert-box error";
        alertBox.style.display = "block";
      }
    } catch (err) {
      alertBox.textContent = "Network error updating password.";
      alertBox.className = "alert-box error";
      alertBox.style.display = "block";
    }
  });
}
