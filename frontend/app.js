const API_BASE = "http://localhost:5000/api";

const Auth = {
  async login(mail, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail, password })
      });
      if (!res.ok) {
        throw new Error((await res.json()).message || "Login failed");
      }
      const data = await res.json();
      sessionStorage.setItem("loh_token", data.token);
      sessionStorage.setItem("loh_role", data.role);
      // Backend does not return name, we just display the email prefix as a placeholder
      sessionStorage.setItem("loh_name", mail.split("@")[0]);
      return data;
    } catch (err) {
      throw err;
    }
  },
  logout() {
    sessionStorage.removeItem("loh_token");
    sessionStorage.removeItem("loh_role");
    sessionStorage.removeItem("loh_name");
    location.hash = "";
    location.reload();
  },
  getToken() {
    return sessionStorage.getItem("loh_token");
  },
  getRole() {
    return sessionStorage.getItem("loh_role");
  },
  getName() {
    return sessionStorage.getItem("loh_name");
  },
  isLoggedIn() {
    return !!this.getToken();
  }
};

async function apiCall(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }

function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $("#toast-container").appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 3000);
}

function statusBadge(status) {
  const map = { pending: "pending", approved: "approved", partial: "partial", denied: "denied", returned: "returned" };
  return `<span class="badge badge-${map[status] || "pending"}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

const routes = {};
function registerRoute(hash, role, title, render) { routes[hash] = { role, title, render }; }
function navigate(hash) { location.hash = hash; }

function handleRoute() {
  if (!Auth.isLoggedIn()) return showLogin();
  const role = Auth.getRole();
  const hash = location.hash.slice(1) || defaultRoute(role);
  const route = routes[hash];
  if (!route || route.role !== role) { navigate(defaultRoute(role)); return; }
  $("#page-title").textContent = route.title;
  $("#breadcrumb").textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} / ${route.title}`;
  $$(".nav-link").forEach(l => l.classList.toggle("active", l.dataset.route === hash));
  route.render($("#content-area"));
}

function defaultRoute(role) {
  return { student: "student-dashboard", operator: "operator-dashboard", admin: "admin-dashboard" }[role];
}

function showLogin() { $("#login-screen").classList.remove("hidden"); $("#app-shell").classList.add("hidden"); }

function showApp() {
  if (!Auth.isLoggedIn()) return;
  $("#login-screen").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
  $("#user-display-name").textContent = Auth.getName();
  $("#user-display-role").textContent = Auth.getRole();
  buildSidebar(Auth.getRole());
  handleRoute();
}

function buildSidebar(role) {
  const nav = $("#sidebar-nav");
  const links = {
    student: [
      { section: "Main" },
      { icon: "📊", label: "Dashboard", route: "student-dashboard" },
      { icon: "🔧", label: "View Items", route: "student-items" },
      { icon: "📝", label: "Make Request", route: "student-request" },
      { icon: "📋", label: "My Requests", route: "student-my-requests" }
    ],
    operator: [
      { section: "Main" },
      { icon: "📊", label: "Dashboard", route: "operator-dashboard" },
      { icon: "🔧", label: "View Items", route: "operator-items" },
      { icon: "📬", label: "Pending Requests", route: "operator-requests" },
      { icon: "↩️", label: "Process Returns", route: "operator-returns" }
    ],
    admin: [
      { section: "Main" },
      { icon: "📊", label: "Dashboard", route: "admin-dashboard" },
      { icon: "🔧", label: "View Items", route: "admin-items" },
      { icon: "📬", label: "All Requests", route: "admin-requests" },
      { icon: "➕", label: "Add Item", route: "admin-add-item" },
      { icon: "🔧", label: "Update Stock", route: "admin-update-stock" },
      { icon: "🗑️", label: "Delete Item", route: "admin-delete-item" }
    ]
  };
  nav.innerHTML = (links[role] || []).map(item => {
    if (item.section) return `<div class="nav-section">${item.section}</div>`;
    return `<a class="nav-link" data-route="${item.route}" href="#${item.route}"><span class="icon">${item.icon}</span>${item.label}</a>`;
  }).join("");
}

// ── STUDENT VIEWS ──

registerRoute("student-dashboard", "student", "Dashboard", async (container) => {
  container.innerHTML = `<div class="empty-state"><p>Loading dashboard...</p></div>`;
  try {
    const requests = await apiCall("/student/my-requests");
    const pending = requests.filter(r => r.status === "pending").length;
    const approved = requests.filter(r => r.status === "approved").length;
    const returned = requests.filter(r => r.status === "returned").length;

    container.innerHTML = `
      <div class="section-header"><h2>Welcome, ${Auth.getName()} 👋</h2></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon amber">⏳</div><div><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">${approved}</div><div class="stat-label">Approved</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">↩️</div><div><div class="stat-value">${returned}</div><div class="stat-label">Returned</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Requests</h3></div>
        ${requests.length === 0
        ? '<div class="empty-state"><div class="icon">📭</div><p>No requests yet. Browse items and make your first request!</p></div>'
        : `<div class="table-wrapper"><table>
              <thead><tr><th>Request ID</th><th>Due Date</th><th>Collection Info</th><th>Status</th></tr></thead>
              <tbody>${requests.slice(-5).reverse().map(r =>
          `<tr>
                  <td>#${r.id}</td>
                  <td>${fmtDate(r.due_date)}</td>
                  <td>${r.collection_location ? r.collection_location + " @ " + new Date(r.collection_time).toLocaleString() : "Not assigned"}</td>
                  <td>${statusBadge(r.status)}</td>
                </tr>`
        ).join("")}</tbody></table></div>`}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:red"><p>Failed to load dashboard: ${err.message}</p></div>`;
  }
});

window.currentProducts = [];
const renderItemsView = async (container, role) => {
  container.innerHTML = `<div class="empty-state"><p>Loading items...</p></div>`;
  try {
    const products = await apiCall(`/${role}/products`);
    window.currentProducts = products;
    container.innerHTML = `
      <div class="section-header"><h2>Hardware Inventory</h2></div>
      <div class="items-grid" id="items-grid">${renderItemCards(products)}</div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:red"><p>Failed to load inventory: ${err.message}</p></div>`;
  }
};

registerRoute("student-items", "student", "View Items", (c) => renderItemsView(c, "student"));
registerRoute("operator-items", "operator", "View Items", (c) => renderItemsView(c, "operator"));
registerRoute("admin-items", "admin", "View Items", (c) => renderItemsView(c, "admin"));

function renderItemCards(products) {
  if (products.length === 0) return '<div class="empty-state"><div class="icon">🔍</div><p>No items found</p></div>';
  const role = Auth.getRole();
  return products.map(p => {
    const qtyClass = p.available_quantity > 5 ? "in-stock" : p.available_quantity > 0 ? "low-stock" : "no-stock";
    return `<div class="item-card" onclick="showItemModal(${p.id})">
        ${p.image_url ? `<img src="${p.image_url}" class="item-img" alt="${p.name}"/>` : '<div class="item-img-placeholder">📷</div>'}
        <div class="item-name">${p.name}</div>
        <div class="item-meta">
          <span class="item-condition">ID: ${p.id}</span>
          <span class="item-qty ${qtyClass}">${p.available_quantity} available</span>
        </div></div>`;
  }).join("");
}

let cart = [];

registerRoute("student-request", "student", "Make Request", async (container) => {
  cart = [];
  container.innerHTML = `<div class="empty-state"><p>Loading request form...</p></div>`;
  try {
    const allProducts = await apiCall("/student/products");
    const products = allProducts.filter(p => p.available_quantity > 0);
    renderRequestForm(container, products);
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:red"><p>Failed to load options: ${err.message}</p></div>`;
  }
});

function renderRequestForm(container, products) {
  container.innerHTML = `
    <div class="section-header"><h2>Submit a Hardware Request</h2></div>
    <div class="card" style="max-width:700px">
      <h3 style="margin-bottom:16px">Add Items to Request</h3>
      <div class="flex gap-sm" style="margin-bottom:16px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:2;margin-bottom:0;min-width:200px">
          <label for="cart-item">Item</label>
          <select id="cart-item" class="form-control">
            <option value="">— Choose —</option>
            ${products.map(p => `<option value="${p.id}" data-name="${p.name}">${p.name} (${p.available_quantity} avail)</option>`).join("")}
          </select>
        </div>
        <div class="form-group" style="flex:1;margin-bottom:0;min-width:80px">
          <label for="cart-qty">Qty</label>
          <input id="cart-qty" class="form-control" type="number" min="1" max="10" value="1" />
        </div>
        <button class="btn btn-outline btn-sm" onclick="addToCart()" style="height:42px">➕ Add</button>
      </div>
      <div id="cart-list" style="margin-bottom:20px">${renderCart()}</div>
      <hr style="border-color:var(--border-glass);margin-bottom:20px"/>
      <form id="request-form">
        <button type="submit" class="btn btn-primary btn-block" ${cart.length === 0 ? "disabled" : ""}>Submit Request</button>
      </form>
    </div>`;

  $("#cart-item").addEventListener("change", () => {
    const p = products.find(p => p.id === parseInt($("#cart-item").value));
    if (p) $("#cart-qty").max = p.available_quantity;
  });

  $("#request-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (cart.length === 0) return toast("Add at least one item", "error");
    try {
      const payload = { items: cart.map(c => ({ product_id: c.product_id, qty: c.qty })) };
      await apiCall("/student/request", { method: "POST", body: JSON.stringify(payload) });
      toast("Request submitted successfully!", "success");
      cart = [];
      navigate("student-my-requests");
    } catch (err) {
      toast("Error: " + err.message, "error");
    }
  });
}

function renderCart() {
  if (cart.length === 0) return '<p style="color:var(--text-muted);font-size:13px">No items added yet.</p>';
  return `<div class="table-wrapper"><table><thead><tr><th>Item</th><th>Qty</th><th></th></tr></thead>
    <tbody>${cart.map((c, i) => `<tr><td>${c.name}</td><td>${c.qty}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeFromCart(${i})">✗</button></td></tr>`).join("")}</tbody></table></div>`;
}

window.addToCart = async function () {
  const sel = $("#cart-item");
  const pid = parseInt(sel.value);
  const qty = parseInt($("#cart-qty").value);
  const name = sel.options[sel.selectedIndex]?.dataset?.name;
  if (!pid) return toast("Select an item", "error");
  const existing = cart.find(c => c.product_id === pid);
  if (existing) { existing.qty += qty; } else { cart.push({ product_id: pid, name, qty }); }

  try {
    const allProducts = await apiCall("/student/products");
    renderRequestForm($("#content-area"), allProducts.filter(p => p.available_quantity > 0));
    toast("Item added to cart", "success");
  } catch (e) { }
};

window.removeFromCart = async function (index) {
  cart.splice(index, 1);
  try {
    const allProducts = await apiCall("/student/products");
    renderRequestForm($("#content-area"), allProducts.filter(p => p.available_quantity > 0));
  } catch (e) { }
};

registerRoute("student-my-requests", "student", "My Requests", async (container) => {
  container.innerHTML = `<div class="empty-state"><p>Loading requests...</p></div>`;
  try {
    const requests = await apiCall("/student/my-requests");
    requests.reverse();
    container.innerHTML = `
      <div class="section-header"><h2>My Requests</h2></div>
      ${requests.length === 0
        ? '<div class="card"><div class="empty-state"><div class="icon">📭</div><p>No requests yet.</p></div></div>'
        : `<div class="table-wrapper"><table>
            <thead><tr><th>Request ID</th><th>Due Date</th><th>Location</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>${requests.map(r => `
              <tr>
                <td style="font-weight:600;color:var(--text-primary)">#${r.id}</td>
                <td>${fmtDate(r.due_date)}</td>
                <td>${r.collection_location || '—'}</td>
                <td>${r.collection_time ? new Date(r.collection_time).toLocaleString() : '—'}</td>
                <td>${statusBadge(r.status)}</td>
              </tr>
            `).join("")}</tbody></table></div>`}`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:red"><p>Failed to load requests: ${err.message}</p></div>`;
  }
});

// ── OPERATOR VIEWS ──

registerRoute("operator-dashboard", "operator", "Dashboard", async (container) => {
  container.innerHTML = `<div class="empty-state"><p>Loading operator dashboard...</p></div>`;
  try {
    const pendingRequests = await apiCall("/operator/pending");
    container.innerHTML = `
      <div class="section-header"><h2>Operator Dashboard</h2></div>
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="stat-card"><div class="stat-icon amber">⏳</div><div><div class="stat-value">${pendingRequests.length}</div><div class="stat-label">Pending Approval</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Pending Requests</h3></div>
        ${pendingRequests.length === 0
        ? '<div class="empty-state"><div class="icon">📭</div><p>No pending requests.</p></div>'
        : `<div class="table-wrapper"><table>
            <thead><tr><th>Request ID</th><th>Student ID</th><th>Status</th></tr></thead>
            <tbody>${pendingRequests.slice(0, 5).map(r =>
          `<tr><td>#${r.id}</td><td>Student #${r.student_id}</td><td>${statusBadge(r.status)}</td></tr>`
        ).join("")}</tbody></table></div>`}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:red"><p>Failed to load dashboard: ${err.message}</p></div>`;
  }
});

registerRoute("operator-requests", "operator", "Pending Requests", async (container) => {
  container.innerHTML = `<div class="empty-state"><p>Loading pending requests...</p></div>`;
  try {
    const pendingRequests = await apiCall("/operator/pending");
    container.innerHTML = `
      <div class="section-header"><h2>Pending Requests</h2></div>
      ${pendingRequests.length === 0
        ? '<div class="card"><div class="empty-state"><div class="icon">✅</div><p>All caught up!</p></div></div>'
        : pendingRequests.map(r => `
          <div class="card" style="margin-bottom:16px">
            <div class="card-header"><h3>Request #${r.id}</h3><span style="font-size:13px;color:var(--text-muted)">Student ID: ${r.student_id}</span></div>
            <div style="margin-bottom: 16px;">
              <h4 style="font-size: 14px; margin-bottom: 8px; color: var(--text-primary);">Requested Items</h4>
              ${r.items && r.items.length ? `
                <div class="table-wrapper" style="margin-bottom: 16px;">
                  <table>
                    <thead><tr><th>Item</th><th>Available</th><th>Requested</th><th>Approve Qty</th></tr></thead>
                    <tbody>
                      ${r.items.map(i => `
                        <tr>
                          <td>${i.name}</td>
                          <td style="color: ${i.available_quantity < i.requested_qty ? 'var(--danger)' : 'var(--text-primary)'};">${i.available_quantity}</td>
                          <td>${i.requested_qty}</td>
                          <td>
                            <input type="number" 
                                   class="form-control qty-input-req-${r.id}" 
                                   data-pid="${i.product_id}" 
                                   min="0" 
                                   max="${i.available_quantity}" 
                                   value="${Math.min(i.requested_qty, i.available_quantity)}" 
                                   style="width: 80px; padding: 4px 8px; margin: 0; min-height: 0;" />
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '<p style="color:var(--text-muted); font-size: 13px;">No items found.</p>'}
            </div>
            <div class="flex gap-sm" style="flex-wrap:wrap;align-items:flex-end">
              <div class="form-group" style="flex:1;margin-bottom:0;min-width:150px">
                <label>Collection Location</label>
                <input class="form-control coll-loc" data-req="${r.id}" type="text" placeholder="e.g. Lab 201"/>
              </div>
            </div>
            <div class="flex gap-sm" style="margin-top:16px">
              <button class="btn btn-success btn-sm" onclick="approveRequest(${r.id})">✓ Approve</button>
            </div>
          </div>`).join("")}`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:red"><p>Failed to load requests: ${err.message}</p></div>`;
  }
});

window.approveRequest = async function (reqId) {
  const loc = document.querySelector(`.coll-loc[data-req="${reqId}"]`).value.trim();
  if (!loc) return toast("Please provide a collection location", "error");

  const qtyInputs = document.querySelectorAll(`.qty-input-req-${reqId}`);
  const approvedItems = [];
  let valid = true;

  qtyInputs.forEach(input => {
    const pid = parseInt(input.dataset.pid);
    const qty = parseInt(input.value) || 0;
    const max = parseInt(input.max) || 0;
    if (qty > max) {
      toast(`Cannot approve ${qty} units. Only ${max} available.`, "error");
      valid = false;
    }
    approvedItems.push({ product_id: pid, approved_qty: qty });
  });

  if (!valid) return;

  try {
    await apiCall("/operator/approve", {
      method: "POST",
      body: JSON.stringify({ request_id: reqId, location: loc, approved_items: approvedItems })
    });
    toast("Request approved!", "success");
    handleRoute();
  } catch (err) {
    toast("Failed to approve: " + err.message, "error");
  }
};

registerRoute("operator-returns", "operator", "Process Returns", (container) => {
  container.innerHTML = `
    <div class="section-header"><h2>Process Returning Items</h2></div>
    <div class="card" style="max-width:500px">
      <h3 style="margin-bottom:16px">Mark Request as Returned</h3>
      <div class="form-group">
        <label>Request ID</label>
        <input id="return-req-id" class="form-control" type="number" placeholder="Enter Request ID" required />
      </div>
      <button class="btn btn-primary" onclick="processReturn()">Submit Return</button>
    </div>
  `;
});

window.processReturn = async function () {
  const reqId = parseInt($("#return-req-id").value);
  if (!reqId) return toast("Enter valid Request ID", "error");
  try {
    await apiCall("/operator/return", {
      method: "POST",
      body: JSON.stringify({ request_id: reqId })
    });
    toast("Return processed successfully", "success");
    $("#return-req-id").value = "";
  } catch (err) {
    toast("Failed to process return: " + err.message, "error");
  }
};

// ── ADMIN VIEWS ──

registerRoute("admin-dashboard", "admin", "Dashboard", (container) => {
  container.innerHTML = `
    <div class="section-header"><h2>Admin Dashboard</h2></div>
    <div class="card">
      <div class="empty-state"><p>Welcome to Admin Panel. Use the sidebar to manage inventory.</p></div>
    </div>`;
});

window.currentAdminRequests = [];
registerRoute("admin-requests", "admin", "All Requests", async (container) => {
  container.innerHTML = `<div class="empty-state"><p>Loading all requests...</p></div>`;
  try {
    const allRequests = await apiCall("/admin/requests");
    window.currentAdminRequests = allRequests;
    container.innerHTML = `
      <div class="section-header"><h2>All Student Requests</h2></div>
      ${allRequests.length === 0
        ? '<div class="card"><div class="empty-state"><div class="icon">📭</div><p>No requests found.</p></div></div>'
        : `<div class="table-wrapper"><table>
            <thead><tr><th>Request ID</th><th>Student</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${allRequests.map(r => `
              <tr style="cursor: pointer;" onclick="showRequestModal(${r.id})">
                <td style="font-weight:600;color:var(--text-primary)">#${r.id}</td>
                <td>${r.student_name}</td>
                <td>${statusBadge(r.status)}</td>
                <td><button class="btn btn-outline btn-sm">View</button></td>
              </tr>`).join("")}</tbody></table></div>`}`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:red"><p>Failed to load requests: ${err.message}</p></div>`;
  }
});

registerRoute("admin-add-item", "admin", "Add New Item", (container) => {
  container.innerHTML = `
    <div class="section-header"><h2>Add New Hardware Item</h2></div>
    <div class="card" style="max-width:600px"><form id="add-item-form">
      <div class="form-group"><label>Item Name</label><input id="item-name" class="form-control" type="text" required /></div>
      <div class="form-group"><label>Image URL (optional)</label><input id="item-img" class="form-control" type="url" /></div>
      <div class="form-group"><label>Condition Note</label><input id="item-cond" class="form-control" type="text" required /></div>
      <div class="form-group"><label>Quantity</label><input id="item-qty" class="form-control" type="number" min="1" value="1" required /></div>
      <button type="submit" class="btn btn-primary btn-block">Add Item</button>
    </form></div>`;
  $("#add-item-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: $("#item-name").value.trim(),
      image_url: $("#item-img").value.trim(),
      condition_note: $("#item-cond").value.trim(),
      quantity: parseInt($("#item-qty").value)
    };
    try {
      await apiCall("/admin/add-product", { method: "POST", body: JSON.stringify(payload) });
      toast("Item added successfully!", "success");
      e.target.reset();
    } catch (err) {
      toast("Error: " + err.message, "error");
    }
  });
});

registerRoute("admin-update-stock", "admin", "Update Stock", (container) => {
  container.innerHTML = `
    <div class="section-header"><h2>Update Inventory Stock</h2></div>
    <div class="card" style="max-width:500px">
      <form id="update-form">
        <div class="form-group">
          <label>Product ID</label>
          <input id="upd-id" class="form-control" type="number" required />
        </div>
        <div class="form-group">
          <label>Quantity to add</label>
          <input id="upd-qty" class="form-control" type="number" required placeholder="Use negative values to reduce" />
        </div>
        <button type="submit" class="btn btn-primary">Update Stock</button>
      </form>
    </div>`;
  $("#update-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await apiCall("/admin/update-stock", {
        method: "PUT",
        body: JSON.stringify({ product_id: parseInt($("#upd-id").value), qty: parseInt($("#upd-qty").value) })
      });
      toast("Stock updated successfully!", "success");
      e.target.reset();
    } catch (err) {
      toast(err.message, "error");
    }
  });
});

registerRoute("admin-delete-item", "admin", "Delete Item", (container) => {
  container.innerHTML = `
    <div class="section-header"><h2>Delete Item</h2></div>
    <div class="card" style="max-width:500px">
      <form id="delete-form">
        <div class="form-group">
          <label>Product ID to Remove</label>
          <input id="del-id" class="form-control" type="number" required />
        </div>
        <button type="submit" class="btn btn-danger">🗑️ Delete Product</button>
      </form>
    </div>`;
  $("#delete-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await apiCall(`/admin/delete/${$("#del-id").value}`, { method: "DELETE" });
      toast("Product deleted successfully!", "success");
      e.target.reset();
    } catch (err) {
      toast(err.message, "error");
    }
  });
});

// ── MODALS LOGIC ──

window.hideModal = function () {
  $("#global-modal").classList.add("hidden");
  document.body.style.overflow = "";
};

window.showItemModal = function (id) {
  if (!window.currentProducts || window.currentProducts.length === 0) {
    console.error("Products not loaded yet");
    return;
  }

  const p = window.currentProducts.find(x => String(x.id) === String(id));
  if (!p) {
    console.error("Product not found", id);
    return;
  }
  if (!p) return;
  const role = Auth.getRole();
  const requestBtnHtml = role === 'student' ? `<button class="btn btn-primary btn-block" onclick="navigate('student-request'); hideModal();" style="margin-top: 24px;">Make Request for Item</button>` : '';

  const modal = $("#global-modal");
  modal.innerHTML = `
    <div class="custom-modal-backdrop" onclick="hideModal()"></div>
    <div class="custom-modal-content" style="max-width: 500px; padding: 32px;">
      <div class="custom-modal-header">
        <h3>${p.name}</h3>
        <button class="custom-modal-close" onclick="hideModal()" aria-label="Close modal">&times;</button>
      </div>
      <div class="custom-modal-body">
        ${p.image_url ? `<img src="${p.image_url}" class="enlarged-img" alt="${p.name}"/>` : '<div style="height: 250px; display:flex; align-items:center; justify-content:center; background:var(--bg-secondary); border-radius: var(--radius-md); font-size: 48px; margin: 0 auto 20px auto;">📷</div>'}
        <p style="font-size: 15px; margin-bottom: 24px;">${p.condition_note || 'No condition note provided.'}</p>
        <div class="custom-modal-info-grid">
          <div class="custom-modal-info-item text-center">
            <div class="custom-modal-info-label">Item ID</div>
            <div class="custom-modal-info-value">#${p.id}</div>
          </div>
          <div class="custom-modal-info-item text-center">
            <div class="custom-modal-info-label">Stock (Avail/Total)</div>
            <div class="custom-modal-info-value">${p.available_quantity} / ${p.total_quantity}</div>
          </div>
        </div>
  `;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
};

window.showRequestModal = function (id) {
  const req = window.currentAdminRequests.find(r => r.id === id);
  if (!req) return;
  const itemsHtml = req.items && req.items.length
    ? req.items.map(i => `<li>${i.requested_qty}x ${i.name}</li>`).join("")
    : "<li>No items</li>";

  const modal = $("#global-modal");
  modal.innerHTML = `
    <div class="custom-modal-backdrop" onclick="hideModal()"></div>
    <div class="custom-modal-content">
      <div class="custom-modal-header">
        <h3>Request #${req.id} Details</h3>
        <button class="custom-modal-close" onclick="hideModal()" aria-label="Close modal">&times;</button>
      </div>
      <div class="custom-modal-body">
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 8px; color: var(--text-primary);">Student Information</h4>
          <div class="custom-modal-info-grid" style="grid-template-columns: 1fr;">
            <div class="custom-modal-info-item">
              <div class="custom-modal-info-label">Name</div>
              <div class="custom-modal-info-value">${req.student_name}</div>
            </div>
            <div class="custom-modal-info-item">
              <div class="custom-modal-info-label">Email</div>
              <div class="custom-modal-info-value"><a href="mailto:${req.student_email}" style="color:var(--accent); text-decoration:none;">${req.student_email}</a></div>
            </div>
            <div class="custom-modal-info-item">
              <div class="custom-modal-info-label">Phone</div>
              <div class="custom-modal-info-value">${req.student_phone}</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 8px; color: var(--text-primary);">Request Information</h4>
           <div class="custom-modal-info-grid">
            <div class="custom-modal-info-item">
              <div class="custom-modal-info-label">Due Date</div>
              <div class="custom-modal-info-value">${fmtDate(req.due_date)}</div>
            </div>
            <div class="custom-modal-info-item">
              <div class="custom-modal-info-label">Status</div>
              <div class="custom-modal-info-value">${statusBadge(req.status)}</div>
            </div>
            <div class="custom-modal-info-item">
              <div class="custom-modal-info-label">Collection Location</div>
              <div class="custom-modal-info-value">${req.collection_location || '—'}</div>
            </div>
            <div class="custom-modal-info-item">
              <div class="custom-modal-info-label">Collection Time</div>
              <div class="custom-modal-info-value">${req.collection_time ? new Date(req.collection_time).toLocaleString() : '—'}</div>
            </div>
          </div>
        </div>
        
        <div>
          <h4 style="margin-bottom: 8px; color: var(--text-primary);">Requested Items</h4>
          <ul style="padding-left: 20px; color: var(--text-secondary); line-height: 1.6; margin: 0;">
            ${itemsHtml}
          </ul>
        </div>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
};

// ── GLOBAL INIT ──

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mail = $("#login-email").value.trim();
  const password = $("#login-password").value;
  try {
    const user = await Auth.login(mail, password);
    toast(`Welcome!`, "success");
    navigate(defaultRoute(user.role));
    showApp();
  } catch (err) {
    toast(err.message || "Invalid credentials.", "error");
  }
});

$("#logout-btn").addEventListener("click", () => Auth.logout());
window.addEventListener("hashchange", () => { if (Auth.isLoggedIn()) handleRoute(); });

// Initialize app if already logged in
if (Auth.isLoggedIn()) {
  showApp();
} else {
  showLogin();
}
