
const DB = {
  _key(name) { return `loh_${name}`; },

  get(name) {
    try { return JSON.parse(localStorage.getItem(this._key(name))); }
    catch { return null; }
  },

  set(name, data) {
    localStorage.setItem(this._key(name), JSON.stringify(data));
  },

  init() {

    if (this.get('seeded')) return;

    this.set('users', [
      { id: 'u1', username: 'student1', password: 'pass', role: 'student', name: 'Aditya' },
      { id: 'u2', username: 'student2', password: 'pass', role: 'student', name: 'Rohan' },
      { id: 'u3', username: 'operator1', password: 'pass', role: 'operator', name: 'Carol Williams' },
      { id: 'u4', username: 'admin1', password: 'pass', role: 'admin', name: 'Dave Brown' },
    ]);

    this.set('products', [
      { id: 'p1', name: 'Arduino Uno R3', description: 'Microcontroller board based on ATmega328P', quantity: 15, condition: 'Good', category: 'Microcontrollers' },
      { id: 'p2', name: 'Raspberry Pi 4', description: '4GB RAM single-board computer', quantity: 8, condition: 'Good', category: 'SBC' },
      { id: 'p3', name: 'Digital Multimeter', description: 'Fluke 117 True-RMS multimeter', quantity: 20, condition: 'Good', category: 'Instruments' },
      { id: 'p4', name: 'Oscilloscope', description: 'Rigol DS1054Z 4-channel 50MHz', quantity: 5, condition: 'Good', category: 'Instruments' },
      { id: 'p5', name: 'Soldering Station', description: 'Hakko FX-888D temperature-controlled', quantity: 12, condition: 'Good', category: 'Tools' },
      { id: 'p6', name: 'Breadboard', description: '830 tie-point solderless breadboard', quantity: 50, condition: 'New', category: 'Components' },
      { id: 'p7', name: 'ESP32 DevKit', description: 'WiFi + Bluetooth dual-core MCU module', quantity: 10, condition: 'Good', category: 'Microcontrollers' },
      { id: 'p8', name: 'Logic Analyzer', description: '8-channel USB logic analyzer 24MHz', quantity: 6, condition: 'Good', category: 'Instruments' },
    ]);

    this.set('requests', []);
    this.set('seeded', true);
  },
};

DB.init();

const Auth = {
  login(username, password, role) {
    const users = DB.get('users') || [];
    const user = users.find(u => u.username === username && u.password === password && u.role === role);
    if (user) {
      sessionStorage.setItem('loh_session', JSON.stringify(user));
      return user;
    }
    return null;
  },

  logout() {
    sessionStorage.removeItem('loh_session');
    location.hash = '';
    location.reload();
  },

  current() {
    try { return JSON.parse(sessionStorage.getItem('loh_session')); }
    catch { return null; }
  },

  isLoggedIn() { return !!this.current(); },
};

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function genId() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

function statusBadge(status) {
  const map = { pending: 'pending', approved: 'approved', denied: 'denied', issued: 'issued', returned: 'returned' };
  return `<span class="badge badge-${map[status] || 'pending'}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

const routes = {};

function registerRoute(hash, role, title, render) {
  routes[hash] = { role, title, render };
}

function navigate(hash) {
  location.hash = hash;
}

function handleRoute() {
  const user = Auth.current();
  if (!user) return showLogin();

  const hash = location.hash.slice(1) || defaultRoute(user.role);
  const route = routes[hash];

  if (!route || route.role !== user.role) {
    navigate(defaultRoute(user.role));
    return;
  }

  $('#page-title').textContent = route.title;
  $('#breadcrumb').textContent = `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} / ${route.title}`;

  $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.route === hash));

  route.render($('#content-area'));
}

function defaultRoute(role) {
  const map = { student: 'student-dashboard', operator: 'operator-dashboard', admin: 'admin-dashboard' };
  return map[role];
}

function showLogin() {
  $('#login-screen').classList.remove('hidden');
  $('#app-shell').classList.add('hidden');
}

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
    ],
    operator: [
      { section: 'Main' },
      { icon: '📊', label: 'Dashboard', route: 'operator-dashboard' },
      { icon: '📬', label: 'Pending Requests', route: 'operator-requests' },
      { icon: '📦', label: 'Issued Items', route: 'operator-issued' },
      { icon: '↩️', label: 'Return Items', route: 'operator-returns' },
    ],
    admin: [
      { section: 'Main' },
      { icon: '📊', label: 'Dashboard', route: 'admin-dashboard' },
      { icon: '📦', label: 'Inventory', route: 'admin-inventory' },
      { icon: '➕', label: 'Add Item', route: 'admin-add-item' },
      { icon: '✏️', label: 'Update Stock', route: 'admin-update-stock' },
    ],
  };

  nav.innerHTML = (links[role] || []).map(item => {
    if (item.section) return `<div class="nav-section">${item.section}</div>`;
    return `<a class="nav-link" data-route="${item.route}" href="#${item.route}">
              <span class="icon">${item.icon}</span>${item.label}
            </a>`;
  }).join('');
}

registerRoute('student-dashboard', 'student', 'Dashboard', (container) => {
  const user = Auth.current();
  const requests = (DB.get('requests') || []).filter(r => r.studentId === user.id);
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const issued = requests.filter(r => r.status === 'issued').length;
  const denied = requests.filter(r => r.status === 'denied').length;

  container.innerHTML = `
    <div class="section-header"><h2>Welcome back, ${user.name.split(' ')[0]} 👋</h2></div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon amber">⏳</div>
        <div><div class="stat-value">${pending}</div><div class="stat-label">Pending Requests</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div><div class="stat-value">${approved}</div><div class="stat-label">Approved</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">📦</div>
        <div><div class="stat-value">${issued}</div><div class="stat-label">Currently Issued</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">❌</div>
        <div><div class="stat-value">${denied}</div><div class="stat-label">Denied</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Recent Requests</h3></div>
      ${requests.length === 0
      ? '<div class="empty-state"><div class="icon">📭</div><p>No requests yet. Browse items and make your first request!</p></div>'
      : `<div class="table-wrapper"><table>
            <thead><tr><th>Item</th><th>Qty</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>${requests.slice(-5).reverse().map(r => {
        const prod = (DB.get('products') || []).find(p => p.id === r.productId);
        return `<tr><td>${prod ? prod.name : 'Unknown'}</td><td>${r.quantity}</td><td>${fmtDate(r.date)}</td><td>${statusBadge(r.status)}</td></tr>`;
      }).join('')}</tbody>
          </table></div>`
    }
    </div>
  `;
});

registerRoute('student-items', 'student', 'View Items', (container) => {
  const products = DB.get('products') || [];

  container.innerHTML = `
    <div class="section-header"><h2>Hardware Inventory</h2></div>
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input type="text" id="item-search" placeholder="Search items..." />
    </div>
    <div class="items-grid" id="items-grid">
      ${renderItemCards(products)}
    </div>
  `;

  $('#item-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    $('#items-grid').innerHTML = renderItemCards(filtered);
  });
});

function renderItemCards(products) {
  if (products.length === 0) return '<div class="empty-state"><div class="icon">🔍</div><p>No items found</p></div>';
  return products.map(p => {
    const qtyClass = p.quantity > 5 ? 'in-stock' : p.quantity > 0 ? 'low-stock' : 'no-stock';
    return `
      <div class="item-card" onclick="navigate('student-request')" title="Click to request this item">
        <div class="item-name">${p.name}</div>
        <div class="item-desc">${p.description}</div>
        <div class="item-meta">
          <span class="item-condition">${p.condition}</span>
          <span class="item-qty ${qtyClass}">${p.quantity > 0 ? p.quantity + ' available' : 'Out of stock'}</span>
        </div>
      </div>`;
  }).join('');
}

registerRoute('student-request', 'student', 'Make Request', (container) => {
  const products = (DB.get('products') || []).filter(p => p.quantity > 0);

  container.innerHTML = `
    <div class="section-header"><h2>Submit a Hardware Request</h2></div>
    <div class="card" style="max-width:600px">
      <form id="request-form">
        <div class="form-group">
          <label for="req-item">Select Hardware Item</label>
          <select id="req-item" class="form-control" required>
            <option value="">— Choose an item —</option>
            ${products.map(p => `<option value="${p.id}">${p.name} (${p.quantity} available)</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="req-qty">Quantity</label>
          <input id="req-qty" class="form-control" type="number" min="1" max="10" value="1" required />
        </div>
        <div class="form-group">
          <label for="req-purpose">Purpose</label>
          <input id="req-purpose" class="form-control" type="text" placeholder="e.g. Lab experiment, Project work" required />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Submit Request</button>
      </form>
    </div>
  `;

  $('#req-item').addEventListener('change', () => {
    const prod = products.find(p => p.id === $('#req-item').value);
    if (prod) $('#req-qty').max = prod.quantity;
  });

  $('#request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = Auth.current();
    const productId = $('#req-item').value;
    const quantity = parseInt($('#req-qty').value);
    const purpose = $('#req-purpose').value.trim();
    const product = products.find(p => p.id === productId);

    if (!product) return toast('Please select an item', 'error');
    if (quantity < 1 || quantity > product.quantity) return toast('Invalid quantity', 'error');
    if (!purpose) return toast('Please enter a purpose', 'error');

    const requests = DB.get('requests') || [];
    requests.push({
      id: genId(),
      studentId: user.id,
      studentName: user.name,
      productId,
      productName: product.name,
      quantity,
      purpose,
      date: new Date().toISOString(),
      status: 'pending',
      remarks: '',
    });
    DB.set('requests', requests);
    toast('Request submitted successfully!', 'success');
    navigate('student-my-requests');
  });
});

registerRoute('student-my-requests', 'student', 'My Requests', (container) => {
  const user = Auth.current();
  const requests = (DB.get('requests') || []).filter(r => r.studentId === user.id).reverse();

  container.innerHTML = `
    <div class="section-header"><h2>My Requests</h2></div>
    ${requests.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">📭</div><p>You haven\'t made any requests yet.</p></div></div>'
      : `<div class="card"><div class="table-wrapper"><table>
          <thead><tr><th>Item</th><th>Qty</th><th>Purpose</th><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
          <tbody>${requests.map(r => `
            <tr>
              <td style="font-weight:600;color:var(--text-primary)">${r.productName}</td>
              <td>${r.quantity}</td>
              <td>${r.purpose}</td>
              <td>${fmtDate(r.date)}</td>
              <td>${statusBadge(r.status)}</td>
              <td style="color:var(--text-muted);font-size:13px">${r.remarks || '—'}</td>
            </tr>
          `).join('')}</tbody>
        </table></div></div>`
    }
  `;
});


registerRoute('operator-dashboard', 'operator', 'Dashboard', (container) => {
  const requests = DB.get('requests') || [];
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const issued = requests.filter(r => r.status === 'issued').length;
  const total = requests.length;

  container.innerHTML = `
    <div class="section-header"><h2>Operator Dashboard</h2></div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon amber">⏳</div>
        <div><div class="stat-value">${pending}</div><div class="stat-label">Pending Requests</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div><div class="stat-value">${approved}</div><div class="stat-label">Approved (Awaiting Issue)</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">📦</div>
        <div><div class="stat-value">${issued}</div><div class="stat-label">Currently Issued</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">📊</div>
        <div><div class="stat-value">${total}</div><div class="stat-label">Total Requests</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Recent Activity</h3></div>
      ${requests.length === 0
      ? '<div class="empty-state"><div class="icon">📭</div><p>No requests yet.</p></div>'
      : `<div class="table-wrapper"><table>
            <thead><tr><th>Student</th><th>Item</th><th>Qty</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>${requests.slice(-5).reverse().map(r => `
              <tr>
                <td>${r.studentName}</td>
                <td>${r.productName}</td>
                <td>${r.quantity}</td>
                <td>${fmtDate(r.date)}</td>
                <td>${statusBadge(r.status)}</td>
              </tr>
            `).join('')}</tbody>
          </table></div>`
    }
    </div>
  `;
});

registerRoute('operator-requests', 'operator', 'Pending Requests', (container) => {
  renderPendingRequests(container);
});

function renderPendingRequests(container) {
  const requests = (DB.get('requests') || []).filter(r => r.status === 'pending').reverse();

  container.innerHTML = `
    <div class="section-header"><h2>Pending Requests</h2></div>
    ${requests.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">✅</div><p>All caught up! No pending requests.</p></div></div>'
      : `<div class="card"><div class="table-wrapper"><table>
          <thead><tr><th>Student</th><th>Item</th><th>Qty</th><th>Purpose</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>${requests.map(r => `
            <tr>
              <td style="font-weight:600;color:var(--text-primary)">${r.studentName}</td>
              <td>${r.productName}</td>
              <td>${r.quantity}</td>
              <td>${r.purpose}</td>
              <td>${fmtDate(r.date)}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-success btn-sm" onclick="approveRequest('${r.id}')">✓ Approve</button>
                  <button class="btn btn-danger btn-sm" onclick="denyRequest('${r.id}')">✗ Deny</button>
                </div>
              </td>
            </tr>
          `).join('')}</tbody>
        </table></div></div>`
    }
  `;
}

window.approveRequest = function (id) {
  const requests = DB.get('requests') || [];
  const req = requests.find(r => r.id === id);
  if (req) {
    req.status = 'approved';
    req.remarks = 'Approved by operator';
    req.approvedDate = new Date().toISOString();
    DB.set('requests', requests);
    toast('Request approved!', 'success');
    renderPendingRequests($('#content-area'));
  }
};

window.denyRequest = function (id) {
  const reason = prompt('Enter reason for denial (optional):') || 'Denied by operator';
  const requests = DB.get('requests') || [];
  const req = requests.find(r => r.id === id);
  if (req) {
    req.status = 'denied';
    req.remarks = reason;
    DB.set('requests', requests);
    toast('Request denied', 'error');
    renderPendingRequests($('#content-area'));
  }
};

registerRoute('operator-issued', 'operator', 'Issued Items', (container) => {
  renderIssuePage(container);
});

function renderIssuePage(container) {
  const requests = DB.get('requests') || [];
  const approved = requests.filter(r => r.status === 'approved').reverse();
  const issued = requests.filter(r => r.status === 'issued').reverse();

  container.innerHTML = `
    <div class="section-header"><h2>Issue & Track Items</h2></div>

    ${approved.length > 0 ? `
    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><h3>Ready to Issue</h3></div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Student</th><th>Item</th><th>Qty</th><th>Approved On</th><th>Action</th></tr></thead>
        <tbody>${approved.map(r => `
          <tr>
            <td style="font-weight:600;color:var(--text-primary)">${r.studentName}</td>
            <td>${r.productName}</td>
            <td>${r.quantity}</td>
            <td>${r.approvedDate ? fmtDate(r.approvedDate) : '—'}</td>
            <td><button class="btn btn-primary btn-sm" onclick="issueItem('${r.id}')">📦 Issue</button></td>
          </tr>
        `).join('')}</tbody>
      </table></div>
    </div>` : ''}

    <div class="card">
      <div class="card-header"><h3>Currently Issued</h3></div>
      ${issued.length === 0
      ? '<div class="empty-state"><div class="icon">📦</div><p>No items currently issued.</p></div>'
      : `<div class="table-wrapper"><table>
            <thead><tr><th>Student</th><th>Item</th><th>Qty</th><th>Issued On</th><th>Status</th></tr></thead>
            <tbody>${issued.map(r => `
              <tr>
                <td style="font-weight:600;color:var(--text-primary)">${r.studentName}</td>
                <td>${r.productName}</td>
                <td>${r.quantity}</td>
                <td>${r.issuedDate ? fmtDate(r.issuedDate) : '—'}</td>
                <td>${statusBadge('issued')}</td>
              </tr>
            `).join('')}</tbody>
          </table></div>`
    }
    </div>
  `;
}

window.issueItem = function (id) {
  const requests = DB.get('requests') || [];
  const req = requests.find(r => r.id === id);
  if (req) {

    const products = DB.get('products') || [];
    const prod = products.find(p => p.id === req.productId);
    if (prod) {
      prod.quantity = Math.max(0, prod.quantity - req.quantity);
      DB.set('products', products);
    }

    req.status = 'issued';
    req.issuedDate = new Date().toISOString();
    req.remarks = 'Item issued to student';
    DB.set('requests', requests);
    toast('Item issued successfully!', 'success');
    renderIssuePage($('#content-area'));
  }
};

registerRoute('operator-returns', 'operator', 'Return Items', (container) => {
  renderReturnPage(container);
});

function renderReturnPage(container) {
  const requests = (DB.get('requests') || []).filter(r => r.status === 'issued').reverse();

  container.innerHTML = `
    <div class="section-header"><h2>Return Items</h2></div>
    ${requests.length === 0
      ? '<div class="card"><div class="empty-state"><div class="icon">↩️</div><p>No items awaiting return.</p></div></div>'
      : `<div class="card"><div class="table-wrapper"><table>
          <thead><tr><th>Student</th><th>Item</th><th>Qty</th><th>Issued On</th><th>Action</th></tr></thead>
          <tbody>${requests.map(r => `
            <tr>
              <td style="font-weight:600;color:var(--text-primary)">${r.studentName}</td>
              <td>${r.productName}</td>
              <td>${r.quantity}</td>
              <td>${r.issuedDate ? fmtDate(r.issuedDate) : '—'}</td>
              <td><button class="btn btn-warning btn-sm" onclick="returnItem('${r.id}')">↩️ Mark Returned</button></td>
            </tr>
          `).join('')}</tbody>
        </table></div></div>`
    }
  `;
}

window.returnItem = function (id) {
  const requests = DB.get('requests') || [];
  const req = requests.find(r => r.id === id);
  if (req) {

    const products = DB.get('products') || [];
    const prod = products.find(p => p.id === req.productId);
    if (prod) {
      prod.quantity += req.quantity;
      DB.set('products', products);
    }

    req.status = 'returned';
    req.returnedDate = new Date().toISOString();
    req.remarks = 'Item returned by student';
    DB.set('requests', requests);
    toast('Item marked as returned!', 'success');
    renderReturnPage($('#content-area'));
  }
};


registerRoute('admin-dashboard', 'admin', 'Dashboard', (container) => {
  const products = DB.get('products') || [];
  const requests = DB.get('requests') || [];
  const totalStock = products.reduce((s, p) => s + p.quantity, 0);
  const totalItems = products.length;
  const activeTransactions = requests.filter(r => r.status === 'issued').length;
  const totalRequests = requests.length;

  container.innerHTML = `
    <div class="section-header"><h2>Admin Dashboard</h2></div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon purple">📦</div>
        <div><div class="stat-value">${totalItems}</div><div class="stat-label">Item Types</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">🔢</div>
        <div><div class="stat-value">${totalStock}</div><div class="stat-label">Total Stock Units</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">🔄</div>
        <div><div class="stat-value">${activeTransactions}</div><div class="stat-label">Active Issues</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">📊</div>
        <div><div class="stat-value">${totalRequests}</div><div class="stat-label">Total Requests</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Inventory Overview</h3></div>
      ${products.length === 0
      ? '<div class="empty-state"><div class="icon">📦</div><p>No items in inventory.</p></div>'
      : `<div class="table-wrapper"><table>
            <thead><tr><th>Name</th><th>Category</th><th>Condition</th><th>Stock</th></tr></thead>
            <tbody>${products.map(p => {
        const qtyClass = p.quantity > 5 ? 'in-stock' : p.quantity > 0 ? 'low-stock' : 'no-stock';
        return `<tr>
                <td style="font-weight:600;color:var(--text-primary)">${p.name}</td>
                <td>${p.category}</td>
                <td>${p.condition}</td>
                <td><span class="item-qty ${qtyClass}" style="font-weight:700">${p.quantity}</span></td>
              </tr>`;
      }).join('')}</tbody>
          </table></div>`
    }
    </div>
  `;
});

registerRoute('admin-inventory', 'admin', 'Inventory', (container) => {
  renderInventory(container);
});

function renderInventory(container) {
  const products = DB.get('products') || [];

  container.innerHTML = `
    <div class="section-header">
      <h2>Full Inventory</h2>
      <button class="btn btn-primary btn-sm" onclick="navigate('admin-add-item')">➕ Add New Item</button>
    </div>
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input type="text" id="inv-search" placeholder="Search inventory..." />
    </div>
    <div class="card">
      ${products.length === 0
      ? '<div class="empty-state"><div class="icon">📦</div><p>No items in inventory.</p></div>'
      : `<div class="table-wrapper"><table>
            <thead><tr><th>Name</th><th>Description</th><th>Category</th><th>Condition</th><th>Qty</th><th>Actions</th></tr></thead>
            <tbody id="inv-body">${renderInventoryRows(products)}</tbody>
          </table></div>`
    }
    </div>
  `;

  const searchEl = $('#inv-search');
  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
      const body = $('#inv-body');
      if (body) body.innerHTML = renderInventoryRows(filtered);
    });
  }
}

function renderInventoryRows(products) {
  return products.map(p => {
    const qtyClass = p.quantity > 5 ? 'in-stock' : p.quantity > 0 ? 'low-stock' : 'no-stock';
    return `<tr>
      <td style="font-weight:600;color:var(--text-primary)">${p.name}</td>
      <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.description}</td>
      <td>${p.category}</td>
      <td>${p.condition}</td>
      <td><span class="item-qty ${qtyClass}" style="font-weight:700">${p.quantity}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-outline btn-sm" onclick="editItem('${p.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteItem('${p.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

window.deleteItem = function (id) {
  if (!confirm('Delete this item permanently?')) return;
  const products = (DB.get('products') || []).filter(p => p.id !== id);
  DB.set('products', products);
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
    <div class="card" style="max-width:600px">
      <form id="add-item-form">
        <div class="form-group">
          <label for="item-name">Item Name</label>
          <input id="item-name" class="form-control" type="text" placeholder="e.g. Arduino Uno R3" required />
        </div>
        <div class="form-group">
          <label for="item-desc">Description</label>
          <input id="item-desc" class="form-control" type="text" placeholder="Brief description" required />
        </div>
        <div class="form-group">
          <label for="item-category">Category</label>
          <select id="item-category" class="form-control" required>
            <option value="Microcontrollers">Microcontrollers</option>
            <option value="SBC">Single Board Computers</option>
            <option value="Instruments">Instruments</option>
            <option value="Tools">Tools</option>
            <option value="Components">Components</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="item-qty">Quantity</label>
          <input id="item-qty" class="form-control" type="number" min="1" value="1" required />
        </div>
        <div class="form-group">
          <label for="item-condition">Condition</label>
          <select id="item-condition" class="form-control">
            <option value="New">New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Worn">Worn</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Add Item</button>
      </form>
    </div>
  `;

  $('#add-item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const products = DB.get('products') || [];
    products.push({
      id: 'p' + Date.now().toString(36),
      name: $('#item-name').value.trim(),
      description: $('#item-desc').value.trim(),
      category: $('#item-category').value,
      quantity: parseInt($('#item-qty').value),
      condition: $('#item-condition').value,
    });
    DB.set('products', products);
    toast('Item added to inventory!', 'success');
    navigate('admin-inventory');
  });
});

registerRoute('admin-update-stock', 'admin', 'Update Stock', (container) => {
  const products = DB.get('products') || [];
  const editId = sessionStorage.getItem('loh_edit_id');
  const editing = editId ? products.find(p => p.id === editId) : null;

  container.innerHTML = `
    <div class="section-header"><h2>${editing ? 'Edit Item' : 'Update Stock'}</h2></div>
    <div class="card" style="max-width:600px">
      <form id="update-form">
        <div class="form-group">
          <label for="upd-item">Select Item</label>
          <select id="upd-item" class="form-control" required>
            <option value="">— Choose an item —</option>
            ${products.map(p => `<option value="${p.id}" ${editing && editing.id === p.id ? 'selected' : ''}>${p.name} (Current: ${p.quantity})</option>`).join('')}
          </select>
        </div>
        <div id="edit-fields" style="display:${editing ? 'block' : 'none'}">
          <div class="form-group">
            <label for="upd-name">Item Name</label>
            <input id="upd-name" class="form-control" type="text" value="${editing ? editing.name : ''}" />
          </div>
          <div class="form-group">
            <label for="upd-desc">Description</label>
            <input id="upd-desc" class="form-control" type="text" value="${editing ? editing.description : ''}" />
          </div>
          <div class="form-group">
            <label for="upd-cond">Condition</label>
            <select id="upd-cond" class="form-control">
              ${['New', 'Good', 'Fair', 'Worn'].map(c => `<option value="${c}" ${editing && editing.condition === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="upd-qty">New Quantity (set total)</label>
          <input id="upd-qty" class="form-control" type="number" min="0" value="${editing ? editing.quantity : ''}" required />
        </div>
        <div class="flex gap-sm">
          <button type="submit" class="btn btn-primary" style="flex:1">Update</button>
          <button type="button" class="btn btn-outline" onclick="navigate('admin-inventory')" style="flex:1">Cancel</button>
        </div>
      </form>
    </div>
  `;

  $('#upd-item').addEventListener('change', () => {
    const prod = products.find(p => p.id === $('#upd-item').value);
    if (prod) {
      $('#edit-fields').style.display = 'block';
      $('#upd-name').value = prod.name;
      $('#upd-desc').value = prod.description;
      $('#upd-cond').value = prod.condition;
      $('#upd-qty').value = prod.quantity;
    }
  });

  $('#update-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const itemId = $('#upd-item').value;
    if (!itemId) return toast('Select an item', 'error');

    const products = DB.get('products') || [];
    const prod = products.find(p => p.id === itemId);
    if (!prod) return toast('Item not found', 'error');

    prod.name = $('#upd-name').value.trim() || prod.name;
    prod.description = $('#upd-desc').value.trim() || prod.description;
    prod.condition = $('#upd-cond').value;
    prod.quantity = parseInt($('#upd-qty').value);

    DB.set('products', products);
    sessionStorage.removeItem('loh_edit_id');
    toast('Stock updated!', 'success');
    navigate('admin-inventory');
  });
});


$('#login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const role = $('#login-role').value;
  const username = $('#login-username').value.trim();
  const password = $('#login-password').value;

  const user = Auth.login(username, password, role);
  if (user) {
    toast(`Welcome, ${user.name}!`, 'success');
    navigate(defaultRoute(user.role));
    showApp();
  } else {
    toast('Invalid credentials. Please try again.', 'error');
  }
});

$('#logout-btn').addEventListener('click', () => Auth.logout());

window.addEventListener('hashchange', () => {
  if (Auth.isLoggedIn()) handleRoute();
});

$('#mobile-toggle').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
});

if (Auth.isLoggedIn()) {
  showApp();
} else {
  showLogin();
}
