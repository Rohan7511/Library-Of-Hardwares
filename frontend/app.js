const DB = {
  _key(n) { return `loh_${n}`; },
  get(n) { try { return JSON.parse(localStorage.getItem(this._key(n))); } catch { return null; } },
  set(n, d) { localStorage.setItem(this._key(n), JSON.stringify(d)); },
  init() {
    if (this.get('seeded_v2')) return;
    localStorage.removeItem('loh_seeded');
    this.set('users', [
      { id: 1, name: 'Aditya', mail: 'student1@loh.edu', number: '9876543210', password: 'pass', role: 'student' },
      { id: 2, name: 'Rohan', mail: 'student2@loh.edu', number: '9876543211', password: 'pass', role: 'student' },
      { id: 3, name: 'Carol Williams', mail: 'operator1@loh.edu', number: '9876543212', password: 'pass', role: 'operator' },
      { id: 4, name: 'Dave Brown', mail: 'admin1@loh.edu', number: '9876543213', password: 'pass', role: 'admin' },
    ]);
    this.set('products', [
      { id: 1, name: 'Arduino Uno R3', image_url: '', condition_note: 'Good', total_quantity: 15, available_quantity: 15, category: 'Microcontrollers' },
      { id: 2, name: 'Raspberry Pi 4', image_url: '', condition_note: 'Good', total_quantity: 8, available_quantity: 8, category: 'SBC' },
      { id: 3, name: 'Digital Multimeter', image_url: '', condition_note: 'Good', total_quantity: 20, available_quantity: 20, category: 'Instruments' },
      { id: 4, name: 'Oscilloscope', image_url: '', condition_note: 'Good', total_quantity: 5, available_quantity: 5, category: 'Instruments' },
      { id: 5, name: 'Soldering Station', image_url: '', condition_note: 'Good', total_quantity: 12, available_quantity: 12, category: 'Tools' },
      { id: 6, name: 'Breadboard', image_url: '', condition_note: 'New', total_quantity: 50, available_quantity: 50, category: 'Components' },
      { id: 7, name: 'ESP32 DevKit', image_url: '', condition_note: 'Good', total_quantity: 10, available_quantity: 10, category: 'Microcontrollers' },
      { id: 8, name: 'Logic Analyzer', image_url: '', condition_note: 'Good', total_quantity: 6, available_quantity: 6, category: 'Instruments' },
    ]);
    this.set('requests', []);
    this.set('request_items', []);
    this.set('notifications', []);
    this.set('seeded_v2', true);
  },
  nextId(table) {
    const rows = this.get(table) || [];
    return rows.length === 0 ? 1 : Math.max(...rows.map(r => r.id)) + 1;
  }
};
DB.init();

const Auth = {
  login(mail, password, role) {
    const users = DB.get('users') || [];
    const user = users.find(u => u.mail === mail && u.password === password && u.role === role);
    if (user) { sessionStorage.setItem('loh_session', JSON.stringify(user)); return user; }
    return null;
  },
  logout() { sessionStorage.removeItem('loh_session'); location.hash = ''; location.reload(); },
  current() { try { return JSON.parse(sessionStorage.getItem('loh_session')); } catch { return null; } },
  isLoggedIn() { return !!this.current(); },
};

function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }
function genId(t) { return DB.nextId(t); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

function statusBadge(status) {
  const map = { pending: 'pending', approved: 'approved', partial: 'partial', denied: 'denied', returned: 'returned' };
  return `<span class="badge badge-${map[status] || 'pending'}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

function addNotification(userId, message) {
  const notifs = DB.get('notifications') || [];
  notifs.push({ id: genId('notifications'), user_id: userId, message, is_read: false, created_at: new Date().toISOString() });
  DB.set('notifications', notifs);
  updateNotifBadge();
}

function updateNotifBadge() {
  const user = Auth.current();
  if (!user) return;
  const notifs = (DB.get('notifications') || []).filter(n => n.user_id === user.id && !n.is_read);
  const badge = $('#notif-badge');
  if (badge) {
    badge.textContent = notifs.length;
    badge.classList.toggle('hidden', notifs.length === 0);
  }
}

function getRequestItems(requestId) {
  return (DB.get('request_items') || []).filter(ri => ri.request_id === requestId);
}

function getProductName(productId) {
  const p = (DB.get('products') || []).find(p => p.id === productId);
  return p ? p.name : 'Unknown';
}

function getItemsSummary(requestId) {
  const items = getRequestItems(requestId);
  return items.map(i => `${getProductName(i.product_id)} ×${i.requested_qty}`).join(', ');
}

function getUserName(userId) {
  const u = (DB.get('users') || []).find(u => u.id === userId);
  return u ? u.name : 'Unknown';
}

const routes = {};
function registerRoute(hash, role, title, render) { routes[hash] = { role, title, render }; }
function navigate(hash) { location.hash = hash; }

function handleRoute() {
  const user = Auth.current();
  if (!user) return showLogin();
  const hash = location.hash.slice(1) || defaultRoute(user.role);
  const route = routes[hash];
  if (!route || route.role !== user.role) { navigate(defaultRoute(user.role)); return; }
  $('#page-title').textContent = route.title;
  $('#breadcrumb').textContent = `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} / ${route.title}`;
  $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.route === hash));
  route.render($('#content-area'));
  updateNotifBadge();
}

function defaultRoute(role) {
  return { student: 'student-dashboard', operator: 'operator-dashboard', admin: 'admin-dashboard' }[role];
}

function showLogin() { $('#login-screen').classList.remove('hidden'); $('#app-shell').classList.add('hidden'); }

function showApp() {
  const user = Auth.current();
  if (!user) return;
  $('#login-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');
  $('#user-avatar').textContent = user.name.charAt(0);
  $('#user-display-name').textContent = user.name;
  $('#user-display-role').textContent = user.role;
  buildSidebar(user.role);
  handleRoute();
}

function buildSidebar(role) {
  const nav = $('#sidebar-nav');
  const links = {
    student: [
      { section: 'Main' },
      { icon: '📊', label: 'Dashboard', route: 'student-dashboard' },
      { icon: '🔧', label: 'View Items', route: 'student-items' },
      { icon: '📝', label: 'Make Request', route: 'student-request' },
      { icon: '📋', label: 'My Requests', route: 'student-my-requests' },
      { icon: '🔔', label: 'Notifications', route: 'student-notifications' },
    ],
    operator: [
      { section: 'Main' },
      { icon: '📊', label: 'Dashboard', route: 'operator-dashboard' },
      { icon: '📬', label: 'Pending Requests', route: 'operator-requests' },
      { icon: '📦', label: 'Issued Items', route: 'operator-issued' },
      { icon: '↩️', label: 'Return Items', route: 'operator-returns' },
      { icon: '🔔', label: 'Notifications', route: 'operator-notifications' },
    ],
    admin: [
      { section: 'Main' },
      { icon: '📊', label: 'Dashboard', route: 'admin-dashboard' },
      { icon: '📦', label: 'Inventory', route: 'admin-inventory' },
      { icon: '➕', label: 'Add Item', route: 'admin-add-item' },
      { icon: '✏️', label: 'Update Stock', route: 'admin-update-stock' },
      { section: 'Management' },
      { icon: '👥', label: 'Users', route: 'admin-users' },
      { icon: '🔔', label: 'Notifications', route: 'admin-notifications' },
    ],
  };
  nav.innerHTML = (links[role] || []).map(item => {
    if (item.section) return `<div class="nav-section">${item.section}</div>`;
    return `<a class="nav-link" data-route="${item.route}" href="#${item.route}"><span class="icon">${item.icon}</span>${item.label}</a>`;
  }).join('');
}

// ── STUDENT VIEWS ──

registerRoute('student-dashboard', 'student', 'Dashboard', (container) => {
  const user = Auth.current();
  const requests = (DB.get('requests') || []).filter(r => r.student_id === user.id);
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved' || r.status === 'partial').length;
  const returned = requests.filter(r => r.status === 'returned').length;
  const denied = requests.filter(r => r.status === 'denied').length;

  container.innerHTML = `
    <div class="section-header"><h2>Welcome back, ${user.name.split(' ')[0]} 👋</h2></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon amber">⏳</div><div><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div></div>
      <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">${approved}</div><div class="stat-label">Approved</div></div></div>
      <div class="stat-card"><div class="stat-icon blue">↩️</div><div><div class="stat-value">${returned}</div><div class="stat-label">Returned</div></div></div>
      <div class="stat-card"><div class="stat-icon red">❌</div><div><div class="stat-value">${denied}</div><div class="stat-label">Denied</div></div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Recent Requests</h3></div>
      ${requests.length === 0
      ? '<div class="empty-state"><div class="icon">📭</div><p>No requests yet. Browse items and make your first request!</p></div>'
      : `<div class="table-wrapper"><table>
            <thead><tr><th>Items</th><th>Date</th><th>Due Date</th><th>Status</th></tr></thead>
            <tbody>${requests.slice(-5).reverse().map(r =>
        `<tr><td>${getItemsSummary(r.id)}</td><td>${fmtDate(r.created_at)}</td><td>${fmtDate(r.due_date)}</td><td>${statusBadge(r.status)}</td></tr>`
      ).join('')}</tbody></table></div>`}
    </div>`;
});

registerRoute('student-items', 'student', 'View Items', (container) => {
  const products = DB.get('products') || [];
  container.innerHTML = `
    <div class="section-header"><h2>Hardware Inventory</h2></div>
    <div class="search-bar"><span class="search-icon">🔍</span><input type="text" id="item-search" placeholder="Search items..." /></div>
    <div class="items-grid" id="items-grid">${renderItemCards(products)}</div>`;
  $('#item-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(q) || p.condition_note.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    $('#items-grid').innerHTML = renderItemCards(filtered);
  });
});

function renderItemCards(products) {
  if (products.length === 0) return '<div class="empty-state"><div class="icon">🔍</div><p>No items found</p></div>';
  return products.map(p => {
    const qtyClass = p.available_quantity > 5 ? 'in-stock' : p.available_quantity > 0 ? 'low-stock' : 'no-stock';
    return `<div class="item-card" onclick="navigate('student-request')" title="Click to request">
        ${p.image_url ? `<img src="${p.image_url}" class="item-img" alt="${p.name}"/>` : '<div class="item-img-placeholder">📷</div>'}
        <div class="item-name">${p.name}</div>
        <div class="item-desc">${p.condition_note}</div>
        <div class="item-meta">
          <span class="item-condition">${p.category}</span>
          <span class="item-qty ${qtyClass}">${p.available_quantity}/${p.total_quantity} available</span>
        </div></div>`;
  }).join('');
}

let cart = [];

registerRoute('student-request', 'student', 'Make Request', (container) => {
  cart = [];
  const products = (DB.get('products') || []).filter(p => p.available_quantity > 0);
  renderRequestForm(container, products);
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
            ${products.map(p => `<option value="${p.id}">${p.name} (${p.available_quantity} avail)</option>`).join('')}
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
        <div class="form-group">
          <label for="req-location">Preferred Collection Location</label>
          <input id="req-location" class="form-control" type="text" placeholder="e.g. Lab 201, Building A" />
        </div>
        <div class="form-group">
          <label for="req-time">Preferred Collection Time</label>
          <input id="req-time" class="form-control" type="datetime-local" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" ${cart.length === 0 ? 'disabled' : ''}>Submit Request (${cart.length} item${cart.length !== 1 ? 's' : ''})</button>
      </form>
    </div>`;

  $('#cart-item').addEventListener('change', () => {
    const p = products.find(p => p.id === parseInt($('#cart-item').value));
    if (p) $('#cart-qty').max = p.available_quantity;
  });

  $('#request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (cart.length === 0) return toast('Add at least one item', 'error');
    const user = Auth.current();
    const reqId = genId('requests');
    const requests = DB.get('requests') || [];
    requests.push({
      id: reqId, student_id: user.id, status: 'pending', approved_by: null,
      collection_location: $('#req-location').value.trim() || null,
      collection_time: $('#req-time').value || null,
      created_at: new Date().toISOString(), due_date: null
    });
    DB.set('requests', requests);
    const reqItems = DB.get('request_items') || [];
    cart.forEach(c => {
      reqItems.push({ id: genId('request_items'), request_id: reqId, product_id: c.product_id, requested_qty: c.qty, approved_qty: 0 });
      DB.set('request_items', reqItems);
    });
    cart = [];
    toast('Request submitted!', 'success');
    navigate('student-my-requests');
  });
}

function renderCart() {
  if (cart.length === 0) return '<p style="color:var(--text-muted);font-size:13px">No items added yet.</p>';
  return `<div class="table-wrapper"><table><thead><tr><th>Item</th><th>Qty</th><th></th></tr></thead>
    <tbody>${cart.map((c, i) => `<tr><td>${getProductName(c.product_id)}</td><td>${c.qty}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeFromCart(${i})">✗</button></td></tr>`).join('')}</tbody></table></div>`;
}

window.addToCart = function () {
  const pid = parseInt($('#cart-item').value);
  const qty = parseInt($('#cart-qty').value);
  if (!pid) return toast('Select an item', 'error');
  const p = (DB.get('products') || []).find(p => p.id === pid);
  if (!p || qty < 1 || qty > p.available_quantity) return toast('Invalid quantity', 'error');
  const existing = cart.find(c => c.product_id === pid);
  if (existing) { existing.qty += qty; } else { cart.push({ product_id: pid, qty }); }
  const products = (DB.get('products') || []).filter(p => p.available_quantity > 0);
  renderRequestForm($('#content-area'), products);
  toast(`${p.name} added to cart`, 'success');
};

window.removeFromCart = function (index) {
  cart.splice(index, 1);
  const products = (DB.get('products') || []).filter(p => p.available_quantity > 0);
  renderRequestForm($('#content-area'), products);
};

registerRoute('student-my-requests', 'student', 'My Requests', (container) => {
  const user = Auth.current();
  const requests = (DB.get('requests') || []).filter(r => r.student_id === user.id).reverse();
  container.innerHTML = `
    <div class="section-header"><h2>My Requests</h2></div>
    ${requests.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">📭</div><p>No requests yet.</p></div></div>'
      : requests.map(r => {
        const items = getRequestItems(r.id);
        return `<div class="card" style="margin-bottom:16px">
          <div class="card-header"><h3>Request #${r.id}</h3>${statusBadge(r.status)}</div>
          <div class="table-wrapper"><table><thead><tr><th>Item</th><th>Requested</th><th>Approved</th></tr></thead>
          <tbody>${items.map(i => `<tr><td style="font-weight:600;color:var(--text-primary)">${getProductName(i.product_id)}</td><td>${i.requested_qty}</td><td>${i.approved_qty}</td></tr>`).join('')}</tbody></table></div>
          <div style="margin-top:12px;font-size:13px;color:var(--text-secondary)">
            <span>📅 ${fmtDate(r.created_at)}</span>
            ${r.due_date ? `<span style="margin-left:16px">⏰ Due: ${fmtDate(r.due_date)}</span>` : ''}
            ${r.collection_location ? `<span style="margin-left:16px">📍 ${r.collection_location}</span>` : ''}
            ${r.collection_time ? `<span style="margin-left:16px">🕐 ${fmtDateTime(r.collection_time)}</span>` : ''}
          </div></div>`;
      }).join('')}`;
});

// ── NOTIFICATION VIEW (shared) ──

function renderNotifications(container, role) {
  const user = Auth.current();
  const notifs = (DB.get('notifications') || []).filter(n => n.user_id === user.id).reverse();
  container.innerHTML = `
    <div class="section-header"><h2>Notifications</h2>
      ${notifs.some(n => !n.is_read) ? '<button class="btn btn-outline btn-sm" onclick="markAllRead()">Mark all read</button>' : ''}
    </div>
    ${notifs.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">🔔</div><p>No notifications yet.</p></div></div>'
      : `<div class="card">${notifs.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markRead(${n.id})">
            <div class="notif-msg">${n.message}</div>
            <div class="notif-time">${fmtDateTime(n.created_at)}</div>
          </div>`).join('')}</div>`}`;
}

['student', 'operator', 'admin'].forEach(role => {
  registerRoute(`${role}-notifications`, role, 'Notifications', (c) => renderNotifications(c, role));
});

window.markRead = function (id) {
  const notifs = DB.get('notifications') || [];
  const n = notifs.find(n => n.id === id);
  if (n) { n.is_read = true; DB.set('notifications', notifs); updateNotifBadge(); handleRoute(); }
};

window.markAllRead = function () {
  const user = Auth.current();
  const notifs = DB.get('notifications') || [];
  notifs.forEach(n => { if (n.user_id === user.id) n.is_read = true; });
  DB.set('notifications', notifs);
  updateNotifBadge();
  handleRoute();
};

// ── OPERATOR VIEWS ──

registerRoute('operator-dashboard', 'operator', 'Dashboard', (container) => {
  const requests = DB.get('requests') || [];
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved' || r.status === 'partial').length;
  const returned = requests.filter(r => r.status === 'returned').length;
  const total = requests.length;
  container.innerHTML = `
    <div class="section-header"><h2>Operator Dashboard</h2></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon amber">⏳</div><div><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div></div>
      <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">${approved}</div><div class="stat-label">Approved</div></div></div>
      <div class="stat-card"><div class="stat-icon blue">↩️</div><div><div class="stat-value">${returned}</div><div class="stat-label">Returned</div></div></div>
      <div class="stat-card"><div class="stat-icon purple">📊</div><div><div class="stat-value">${total}</div><div class="stat-label">Total</div></div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Recent Activity</h3></div>
      ${requests.length === 0
      ? '<div class="empty-state"><div class="icon">📭</div><p>No requests yet.</p></div>'
      : `<div class="table-wrapper"><table>
          <thead><tr><th>Student</th><th>Items</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>${requests.slice(-5).reverse().map(r =>
        `<tr><td>${getUserName(r.student_id)}</td><td>${getItemsSummary(r.id)}</td><td>${fmtDate(r.created_at)}</td><td>${statusBadge(r.status)}</td></tr>`
      ).join('')}</tbody></table></div>`}
    </div>`;
});

registerRoute('operator-requests', 'operator', 'Pending Requests', (c) => renderPendingRequests(c));

function renderPendingRequests(container) {
  const requests = (DB.get('requests') || []).filter(r => r.status === 'pending').reverse();
  container.innerHTML = `
    <div class="section-header"><h2>Pending Requests</h2></div>
    ${requests.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">✅</div><p>All caught up!</p></div></div>'
      : requests.map(r => {
        const items = getRequestItems(r.id);
        return `<div class="card" style="margin-bottom:16px">
          <div class="card-header"><h3>Request #${r.id} — ${getUserName(r.student_id)}</h3><span style="font-size:13px;color:var(--text-muted)">${fmtDate(r.created_at)}</span></div>
          ${r.collection_location ? `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">📍 Preferred: ${r.collection_location} ${r.collection_time ? '| 🕐 ' + fmtDateTime(r.collection_time) : ''}</p>` : ''}
          <div class="table-wrapper" style="margin-bottom:16px"><table>
            <thead><tr><th>Item</th><th>Requested Qty</th><th>Approve Qty</th></tr></thead>
            <tbody>${items.map(i => `<tr>
              <td style="font-weight:600;color:var(--text-primary)">${getProductName(i.product_id)}</td>
              <td>${i.requested_qty}</td>
              <td><input type="number" class="form-control approve-qty" data-id="${i.id}" min="0" max="${i.requested_qty}" value="${i.requested_qty}" style="width:80px;padding:6px 8px"/></td>
            </tr>`).join('')}</tbody></table></div>
          <div class="flex gap-sm" style="flex-wrap:wrap;align-items:flex-end">
            <div class="form-group" style="flex:1;margin-bottom:0;min-width:150px">
              <label>Collection Location</label>
              <input class="form-control coll-loc" data-req="${r.id}" type="text" value="${r.collection_location || ''}" placeholder="e.g. Lab 201"/>
            </div>
            <div class="form-group" style="flex:1;margin-bottom:0;min-width:150px">
              <label>Collection Time</label>
              <input class="form-control coll-time" data-req="${r.id}" type="datetime-local" value="${r.collection_time || ''}"/>
            </div>
            <div class="form-group" style="flex:1;margin-bottom:0;min-width:130px">
              <label>Due Date</label>
              <input class="form-control due-date" data-req="${r.id}" type="date"/>
            </div>
          </div>
          <div class="flex gap-sm" style="margin-top:16px">
            <button class="btn btn-success btn-sm" onclick="approveRequest(${r.id})">✓ Approve</button>
            <button class="btn btn-danger btn-sm" onclick="denyRequest(${r.id})">✗ Deny</button>
          </div></div>`;
      }).join('')}`;
}

window.approveRequest = function (reqId) {
  const user = Auth.current();
  const requests = DB.get('requests') || [];
  const req = requests.find(r => r.id === reqId);
  if (!req) return;
  const reqItems = DB.get('request_items') || [];
  const items = reqItems.filter(ri => ri.request_id === reqId);
  let allFull = true, allZero = true;
  document.querySelectorAll('.approve-qty').forEach(input => {
    const itemId = parseInt(input.dataset.id);
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.approved_qty = parseInt(input.value) || 0;
      if (item.approved_qty < item.requested_qty) allFull = false;
      if (item.approved_qty > 0) allZero = false;
    }
  });
  DB.set('request_items', reqItems);
  if (allZero) { req.status = 'denied'; } else if (allFull) { req.status = 'approved'; } else { req.status = 'partial'; }
  req.approved_by = user.id;
  const loc = document.querySelector(`.coll-loc[data-req="${reqId}"]`);
  const time = document.querySelector(`.coll-time[data-req="${reqId}"]`);
  const due = document.querySelector(`.due-date[data-req="${reqId}"]`);
  if (loc) req.collection_location = loc.value || req.collection_location;
  if (time) req.collection_time = time.value || req.collection_time;
  if (due) req.due_date = due.value || null;
  DB.set('requests', requests);

  const products = DB.get('products') || [];
  items.forEach(i => {
    if (i.approved_qty > 0) {
      const p = products.find(p => p.id === i.product_id);
      if (p) { p.available_quantity = Math.max(0, p.available_quantity - i.approved_qty); }
    }
  });
  DB.set('products', products);

  addNotification(req.student_id, `Your request #${reqId} has been ${req.status}. ${req.collection_location ? 'Collect at: ' + req.collection_location : ''}`);
  toast(`Request ${req.status}!`, 'success');
  renderPendingRequests($('#content-area'));
};

window.denyRequest = function (reqId) {
  const user = Auth.current();
  const requests = DB.get('requests') || [];
  const req = requests.find(r => r.id === reqId);
  if (!req) return;
  req.status = 'denied';
  req.approved_by = user.id;
  DB.set('requests', requests);
  addNotification(req.student_id, `Your request #${reqId} has been denied.`);
  toast('Request denied', 'error');
  renderPendingRequests($('#content-area'));
};

registerRoute('operator-issued', 'operator', 'Issued Items', (c) => renderIssuePage(c));

function renderIssuePage(container) {
  const requests = DB.get('requests') || [];
  const approved = requests.filter(r => r.status === 'approved' || r.status === 'partial').reverse();
  const returned = requests.filter(r => r.status === 'returned').reverse();
  container.innerHTML = `
    <div class="section-header"><h2>Approved & Issued Items</h2></div>
    ${approved.length > 0 ? `<div class="card" style="margin-bottom:24px">
      <div class="card-header"><h3>Approved — Ready for Collection</h3></div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Student</th><th>Items</th><th>Collection</th><th>Due Date</th><th>Status</th></tr></thead>
        <tbody>${approved.map(r => `<tr>
          <td style="font-weight:600;color:var(--text-primary)">${getUserName(r.student_id)}</td>
          <td>${getItemsSummary(r.id)}</td>
          <td>${r.collection_location || '—'}<br/><small>${fmtDateTime(r.collection_time)}</small></td>
          <td>${fmtDate(r.due_date)}</td>
          <td>${statusBadge(r.status)}</td>
        </tr>`).join('')}</tbody></table></div></div>` : ''}
    ${returned.length > 0 ? `<div class="card">
      <div class="card-header"><h3>Returned Items</h3></div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Student</th><th>Items</th><th>Status</th></tr></thead>
        <tbody>${returned.map(r => `<tr>
          <td>${getUserName(r.student_id)}</td><td>${getItemsSummary(r.id)}</td><td>${statusBadge(r.status)}</td>
        </tr>`).join('')}</tbody></table></div></div>` : ''}
    ${approved.length === 0 && returned.length === 0 ? '<div class="card"><div class="empty-state"><div class="icon">📦</div><p>No approved or returned items.</p></div></div>' : ''}`;
}

registerRoute('operator-returns', 'operator', 'Return Items', (c) => renderReturnPage(c));

function renderReturnPage(container) {
  const requests = (DB.get('requests') || []).filter(r => r.status === 'approved' || r.status === 'partial').reverse();
  container.innerHTML = `
    <div class="section-header"><h2>Return Items</h2></div>
    ${requests.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">↩️</div><p>No items awaiting return.</p></div></div>'
      : `<div class="card"><div class="table-wrapper"><table>
          <thead><tr><th>Student</th><th>Items</th><th>Due Date</th><th>Action</th></tr></thead>
          <tbody>${requests.map(r => `<tr>
            <td style="font-weight:600;color:var(--text-primary)">${getUserName(r.student_id)}</td>
            <td>${getItemsSummary(r.id)}</td>
            <td>${fmtDate(r.due_date)}</td>
            <td><button class="btn btn-warning btn-sm" onclick="returnItem(${r.id})">↩️ Return</button></td>
          </tr>`).join('')}</tbody></table></div></div>`}`;
}

window.returnItem = function (reqId) {
  const requests = DB.get('requests') || [];
  const req = requests.find(r => r.id === reqId);
  if (!req) return;
  const products = DB.get('products') || [];
  const items = getRequestItems(reqId);
  items.forEach(i => {
    const p = products.find(p => p.id === i.product_id);
    if (p) { p.available_quantity += i.approved_qty; }
  });
  DB.set('products', products);
  req.status = 'returned';
  DB.set('requests', requests);
  addNotification(req.student_id, `Your request #${reqId} items have been marked as returned.`);
  toast('Items returned!', 'success');
  renderReturnPage($('#content-area'));
};

// ── ADMIN VIEWS ──

registerRoute('admin-dashboard', 'admin', 'Dashboard', (container) => {
  const products = DB.get('products') || [];
  const requests = DB.get('requests') || [];
  const users = DB.get('users') || [];
  const totalStock = products.reduce((s, p) => s + p.total_quantity, 0);
  const availStock = products.reduce((s, p) => s + p.available_quantity, 0);
  const totalReqs = requests.length;
  container.innerHTML = `
    <div class="section-header"><h2>Admin Dashboard</h2></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon purple">📦</div><div><div class="stat-value">${products.length}</div><div class="stat-label">Item Types</div></div></div>
      <div class="stat-card"><div class="stat-icon blue">🔢</div><div><div class="stat-value">${availStock}/${totalStock}</div><div class="stat-label">Available / Total Stock</div></div></div>
      <div class="stat-card"><div class="stat-icon amber">📊</div><div><div class="stat-value">${totalReqs}</div><div class="stat-label">Total Requests</div></div></div>
      <div class="stat-card"><div class="stat-icon green">👥</div><div><div class="stat-value">${users.length}</div><div class="stat-label">Users</div></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Inventory Overview</h3></div>
      ${products.length === 0 ? '<div class="empty-state"><div class="icon">📦</div><p>No items.</p></div>'
      : `<div class="table-wrapper"><table><thead><tr><th>Name</th><th>Category</th><th>Condition</th><th>Available</th><th>Total</th></tr></thead>
          <tbody>${products.map(p => {
        const qc = p.available_quantity > 5 ? 'in-stock' : p.available_quantity > 0 ? 'low-stock' : 'no-stock';
        return `<tr><td style="font-weight:600;color:var(--text-primary)">${p.name}</td><td>${p.category}</td><td>${p.condition_note}</td>
          <td><span class="item-qty ${qc}" style="font-weight:700">${p.available_quantity}</span></td><td>${p.total_quantity}</td></tr>`;
      }).join('')}</tbody></table></div>`}</div>`;
});

registerRoute('admin-inventory', 'admin', 'Inventory', (c) => renderInventory(c));

function renderInventory(container) {
  const products = DB.get('products') || [];
  container.innerHTML = `
    <div class="section-header"><h2>Full Inventory</h2>
      <button class="btn btn-primary btn-sm" onclick="navigate('admin-add-item')">➕ Add New Item</button></div>
    <div class="search-bar"><span class="search-icon">🔍</span><input type="text" id="inv-search" placeholder="Search inventory..." /></div>
    <div class="card">${products.length === 0 ? '<div class="empty-state"><div class="icon">📦</div><p>No items.</p></div>'
      : `<div class="table-wrapper"><table>
          <thead><tr><th>Name</th><th>Condition</th><th>Category</th><th>Available</th><th>Total</th><th>Actions</th></tr></thead>
          <tbody id="inv-body">${renderInvRows(products)}</tbody></table></div>`}</div>`;
  const s = $('#inv-search');
  if (s) s.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const f = products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    const b = $('#inv-body'); if (b) b.innerHTML = renderInvRows(f);
  });
}

function renderInvRows(products) {
  return products.map(p => {
    const qc = p.available_quantity > 5 ? 'in-stock' : p.available_quantity > 0 ? 'low-stock' : 'no-stock';
    return `<tr><td style="font-weight:600;color:var(--text-primary)">${p.name}</td><td>${p.condition_note}</td><td>${p.category}</td>
      <td><span class="item-qty ${qc}" style="font-weight:700">${p.available_quantity}</span></td><td>${p.total_quantity}</td>
      <td><div class="action-btns">
        <button class="btn btn-outline btn-sm" onclick="editItem(${p.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteItem(${p.id})">🗑️</button>
      </div></td></tr>`;
  }).join('');
}

window.deleteItem = function (id) {
  if (!confirm('Delete this item?')) return;
  DB.set('products', (DB.get('products') || []).filter(p => p.id !== id));
  toast('Item deleted', 'info');
  renderInventory($('#content-area'));
};

window.editItem = function (id) {
  sessionStorage.setItem('loh_edit_id', id);
  navigate('admin-update-stock');
};

registerRoute('admin-add-item', 'admin', 'Add New Item', (container) => {
  container.innerHTML = `
    <div class="section-header"><h2>Add New Hardware Item</h2></div>
    <div class="card" style="max-width:600px"><form id="add-item-form">
      <div class="form-group"><label for="item-name">Item Name</label><input id="item-name" class="form-control" type="text" placeholder="e.g. Arduino Uno R3" required /></div>
      <div class="form-group"><label for="item-img">Image URL (optional)</label><input id="item-img" class="form-control" type="url" placeholder="https://..." /></div>
      <div class="form-group"><label for="item-cond">Condition Note</label><input id="item-cond" class="form-control" type="text" placeholder="e.g. New, Good, Fair" required /></div>
      <div class="form-group"><label for="item-category">Category</label>
        <select id="item-category" class="form-control" required>
          <option value="Microcontrollers">Microcontrollers</option><option value="SBC">Single Board Computers</option>
          <option value="Instruments">Instruments</option><option value="Tools">Tools</option>
          <option value="Components">Components</option><option value="Other">Other</option>
        </select></div>
      <div class="form-group"><label for="item-qty">Total Quantity</label><input id="item-qty" class="form-control" type="number" min="1" value="1" required /></div>
      <button type="submit" class="btn btn-primary btn-block">Add Item</button>
    </form></div>`;
  $('#add-item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const products = DB.get('products') || [];
    const qty = parseInt($('#item-qty').value);
    products.push({
      id: genId('products'), name: $('#item-name').value.trim(), image_url: $('#item-img').value.trim(),
      condition_note: $('#item-cond').value.trim(), total_quantity: qty, available_quantity: qty, category: $('#item-category').value
    });
    DB.set('products', products);
    toast('Item added!', 'success');
    navigate('admin-inventory');
  });
});

registerRoute('admin-update-stock', 'admin', 'Update Stock', (container) => {
  const products = DB.get('products') || [];
  const editId = parseInt(sessionStorage.getItem('loh_edit_id'));
  const editing = editId ? products.find(p => p.id === editId) : null;
  container.innerHTML = `
    <div class="section-header"><h2>${editing ? 'Edit Item' : 'Update Stock'}</h2></div>
    <div class="card" style="max-width:600px"><form id="update-form">
      <div class="form-group"><label>Select Item</label>
        <select id="upd-item" class="form-control" required><option value="">— Choose —</option>
          ${products.map(p => `<option value="${p.id}" ${editing && editing.id === p.id ? 'selected' : ''}>${p.name} (Avail: ${p.available_quantity}/${p.total_quantity})</option>`).join('')}
        </select></div>
      <div id="edit-fields" style="display:${editing ? 'block' : 'none'}">
        <div class="form-group"><label>Item Name</label><input id="upd-name" class="form-control" type="text" value="${editing ? editing.name : ''}" /></div>
        <div class="form-group"><label>Image URL</label><input id="upd-img" class="form-control" type="url" value="${editing ? editing.image_url : ''}" /></div>
        <div class="form-group"><label>Condition Note</label><input id="upd-cond" class="form-control" type="text" value="${editing ? editing.condition_note : ''}" /></div>
        <div class="form-group"><label>Total Quantity</label><input id="upd-total" class="form-control" type="number" min="0" value="${editing ? editing.total_quantity : ''}" required /></div>
        <div class="form-group"><label>Available Quantity</label><input id="upd-avail" class="form-control" type="number" min="0" value="${editing ? editing.available_quantity : ''}" required /></div>
      </div>
      <div class="flex gap-sm">
        <button type="submit" class="btn btn-primary" style="flex:1">Update</button>
        <button type="button" class="btn btn-outline" onclick="navigate('admin-inventory')" style="flex:1">Cancel</button>
      </div></form></div>`;
  $('#upd-item').addEventListener('change', () => {
    const p = products.find(p => p.id === parseInt($('#upd-item').value));
    if (p) {
      $('#edit-fields').style.display = 'block';
      $('#upd-name').value = p.name; $('#upd-img').value = p.image_url || '';
      $('#upd-cond').value = p.condition_note; $('#upd-total').value = p.total_quantity; $('#upd-avail').value = p.available_quantity;
    }
  });
  $('#update-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const itemId = parseInt($('#upd-item').value);
    if (!itemId) return toast('Select an item', 'error');
    const products = DB.get('products') || [];
    const p = products.find(p => p.id === itemId);
    if (!p) return toast('Item not found', 'error');
    p.name = $('#upd-name').value.trim() || p.name;
    p.image_url = $('#upd-img').value.trim();
    p.condition_note = $('#upd-cond').value.trim() || p.condition_note;
    p.total_quantity = parseInt($('#upd-total').value);
    p.available_quantity = parseInt($('#upd-avail').value);
    DB.set('products', products);
    sessionStorage.removeItem('loh_edit_id');
    toast('Stock updated!', 'success');
    navigate('admin-inventory');
  });
});

// ── ADMIN USER MANAGEMENT ──

registerRoute('admin-users', 'admin', 'User Management', (c) => renderUsers(c));

function renderUsers(container) {
  const users = DB.get('users') || [];
  container.innerHTML = `
    <div class="section-header"><h2>User Management</h2>
      <button class="btn btn-primary btn-sm" onclick="showAddUser()">➕ Add User</button></div>
    <div id="user-form-area"></div>
    <div class="card"><div class="table-wrapper"><table>
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Actions</th></tr></thead>
      <tbody>${users.map(u => `<tr>
        <td style="font-weight:600;color:var(--text-primary)">${u.name}</td><td>${u.mail}</td><td>${u.number || '—'}</td>
        <td>${statusBadge(u.role)}</td>
        <td><div class="action-btns"><button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">🗑️</button></div></td>
      </tr>`).join('')}</tbody></table></div></div>`;
}

window.showAddUser = function () {
  $('#user-form-area').innerHTML = `
    <div class="card" style="margin-bottom:20px;max-width:600px"><h3 style="margin-bottom:16px">Add New User</h3>
    <form id="add-user-form">
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:150px"><label>Name</label><input id="nu-name" class="form-control" required /></div>
        <div class="form-group" style="flex:1;min-width:150px"><label>Email</label><input id="nu-mail" class="form-control" type="email" required /></div>
      </div>
      <div class="flex gap-sm" style="flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:120px"><label>Phone</label><input id="nu-number" class="form-control" /></div>
        <div class="form-group" style="flex:1;min-width:120px"><label>Password</label><input id="nu-pass" class="form-control" type="password" required /></div>
        <div class="form-group" style="flex:1;min-width:120px"><label>Role</label>
          <select id="nu-role" class="form-control"><option value="student">Student</option><option value="operator">Operator</option><option value="admin">Admin</option></select></div>
      </div>
      <div class="flex gap-sm"><button type="submit" class="btn btn-primary btn-sm">Save</button>
        <button type="button" class="btn btn-outline btn-sm" onclick="$('#user-form-area').innerHTML=''">Cancel</button></div>
    </form></div>`;
  $('#add-user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const users = DB.get('users') || [];
    if (users.find(u => u.mail === $('#nu-mail').value.trim())) return toast('Email already exists', 'error');
    users.push({
      id: genId('users'), name: $('#nu-name').value.trim(), mail: $('#nu-mail').value.trim(),
      number: $('#nu-number').value.trim(), password: $('#nu-pass').value, role: $('#nu-role').value
    });
    DB.set('users', users);
    toast('User added!', 'success');
    renderUsers($('#content-area'));
  });
};

window.deleteUser = function (id) {
  const current = Auth.current();
  if (current.id === id) return toast('Cannot delete yourself', 'error');
  if (!confirm('Delete this user?')) return;
  DB.set('users', (DB.get('users') || []).filter(u => u.id !== id));
  toast('User deleted', 'info');
  renderUsers($('#content-area'));
};

// ── EVENT LISTENERS ──

$('#login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const role = $('#login-role').value;
  const mail = $('#login-email').value.trim();
  const password = $('#login-password').value;
  const user = Auth.login(mail, password, role);
  if (user) { toast(`Welcome, ${user.name}!`, 'success'); navigate(defaultRoute(user.role)); showApp(); }
  else { toast('Invalid credentials.', 'error'); }
});

$('#logout-btn').addEventListener('click', () => Auth.logout());
window.addEventListener('hashchange', () => { if (Auth.isLoggedIn()) handleRoute(); });
$('#mobile-toggle').addEventListener('click', () => { $('#sidebar').classList.toggle('open'); });
$('#notif-bell').addEventListener('click', () => {
  const user = Auth.current();
  if (user) navigate(`${user.role}-notifications`);
});

if (Auth.isLoggedIn()) { showApp(); } else { showLogin(); }
