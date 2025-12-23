const API_URL = 'http://localhost:3000/api';

// --- Shared Navigation & Auth ---

document.addEventListener('DOMContentLoaded', () => {
    // Check Auth (skip for login page)
    const isLoginPage = location.pathname.includes('index.html') || location.pathname.endsWith('/');

    if (!isLoginPage) {
        if (!localStorage.getItem('user_id')) {
            window.location.href = 'index.html';
        } else {
            loadSidebar();
        }
    }

    // Page Specific Loaders
    if (location.pathname.includes('dashboard.html')) loadDashboardStats();
    if (location.pathname.includes('customers.html')) loadCustomers();
    if (location.pathname.includes('restaurants.html')) loadRestaurants();
    if (location.pathname.includes('delivery.html')) loadDelivery();
    if (location.pathname.includes('orders.html')) loadOrders();
});

function loadSidebar() {
    const sidebar = `
    <div class="logo">
        <i class="fa-solid fa-utensils"></i>
        <h2>RestoSys</h2>
    </div>
    <ul class="nav-links">
        <li class="${location.pathname.includes('dashboard') ? 'active' : ''}" onclick="window.location.href='dashboard.html'"><i class="fa-solid fa-chart-pie"></i> Dashboard</li>
        <li class="${location.pathname.includes('customers') ? 'active' : ''}" onclick="window.location.href='customers.html'"><i class="fa-solid fa-users"></i> Customers</li>
        <li class="${location.pathname.includes('restaurants') ? 'active' : ''}" onclick="window.location.href='restaurants.html'"><i class="fa-solid fa-store"></i> Restaurants</li>
        <li class="${location.pathname.includes('delivery') ? 'active' : ''}" onclick="window.location.href='delivery.html'"><i class="fa-solid fa-truck"></i> Delivery</li>
        <li class="${location.pathname.includes('orders') ? 'active' : ''}" onclick="window.location.href='orders.html'"><i class="fa-solid fa-receipt"></i> Orders</li>
        <li onclick="logout()" style="margin-top:auto; color:var(--danger);"><i class="fa-solid fa-sign-out-alt"></i> Logout</li>
    </ul>
    `;
    const nav = document.createElement('nav');
    nav.className = 'sidebar';
    nav.innerHTML = sidebar;
    document.body.prepend(nav);

    const main = document.querySelector('main');
    if (main) main.classList.add('main-content');
}

function logout() {
    localStorage.removeItem('user_id');
    window.location.href = 'index.html';
}

function toggleAuthMode() {
    const reg = document.getElementById('register-card');
    const logCard = document.getElementById('login-card');

    if (reg.classList.contains('hidden') || reg.style.display === 'none') {
        logCard.style.display = 'none';
        reg.style.display = 'block';
        reg.classList.remove('hidden');
    } else {
        reg.style.display = 'none';
        reg.classList.add('hidden');
        logCard.style.display = 'block';
    }
}

// Auth Forms
const logForm = document.getElementById('login-form');
if (logForm) {
    logForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('user_id', data.user.id);
                window.location.href = 'dashboard.html';
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch (err) { console.error(err); }
    });
}

const regForm = document.getElementById('register-form');
if (regForm) {
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('reg-username').value;
        const p = document.getElementById('reg-password').value;

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            if (res.ok) {
                showToast('Registration successful! Please login.');
                toggleAuthMode();
            } else {
                showToast('Registration failed', 'error');
            }
        } catch (err) { console.error(err); }
    });
}


// --- Dashboard ---

async function loadDashboardStats() {
    try {
        const [resCust, resRest, resOrders] = await Promise.all([
            fetch(`${API_URL}/customers`),
            fetch(`${API_URL}/restaurants`),
            fetch(`${API_URL}/orders`)
        ]);
        const custs = await resCust.json();
        const rests = await resRest.json();
        const orders = await resOrders.json();

        animateValue("total-customers", 0, custs.length, 1000);
        animateValue("total-restaurants", 0, rests.length, 1000);
        animateValue("total-orders", 0, orders.length, 1000);
    } catch (e) { console.error(e); }
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}


// --- Customers ---

let searchTimeout;
function searchCustomers() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const q = document.getElementById('cust-search').value;
        loadCustomers(q);
    }, 500);
}

async function loadCustomers(query = '') {
    try {
        const url = query ? `${API_URL}/customers/search?q=${query}` : `${API_URL}/customers`;
        const res = await fetch(url);
        const customers = await res.json();
        const tbody = document.getElementById('customer-list');
        tbody.innerHTML = '';
        customers.forEach(c => {
            const status = c.is_premium ?
                '<span style="color:#ffd700; font-weight:bold;"><i class="fa-solid fa-crown"></i> Premium</span>' :
                '<span style="color:var(--text-secondary)">Standard</span>';

            // Serialize customer object for edit
            const cStr = JSON.stringify(c).replace(/"/g, '&quot;').replace(/'/g, "\\'");

            tbody.innerHTML += `
                <tr>
                    <td>#${c.cust_id}</td>
                    <td style="font-weight:600">${c.name}</td>
                    <td>${c.phone}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.area_id}</td>
                    <td>${status}</td>
                    <td>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn-secondary" style="padding:0.3rem 0.5rem; font-size:0.8rem" onclick="viewHistory(${c.cust_id})" title="History"><i class="fa-solid fa-clock-rotate-left"></i></button>
                            <button class="btn-primary" style="padding:0.3rem 0.5rem; font-size:0.8rem; background:var(--accent);" onclick="openEditModal(${cStr})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-primary" style="padding:0.3rem 0.5rem; font-size:0.8rem; background:var(--danger);" onclick="deleteCustomer(${c.cust_id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (err) { showToast('Error loading customers', 'error'); }
}

async function viewHistory(custId) {
    try {
        const res = await fetch(`${API_URL}/customers/${custId}/history`);
        const history = await res.json();
        const tbody = document.getElementById('history-list');
        tbody.innerHTML = '';
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No orders found</td></tr>';
        } else {
            history.forEach(h => {
                tbody.innerHTML += `
                    <tr>
                        <td>#${h.order_id}</td>
                        <td>${h.rest_name}</td>
                        <td>${new Date(h.order_date).toLocaleDateString()}</td>
                        <td>$${h.total}</td>
                    </tr>
                `;
            });
        }
        document.getElementById('history-modal').style.display = 'flex';
    } catch (err) { console.error(err); }
}

async function deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
        const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Customer deleted');
            loadCustomers();
        } else {
            const d = await res.json();
            showToast(d.error || 'Failed to delete', 'error');
        }
    } catch (err) { console.error(err); }
}

function openEditModal(c) {
    document.getElementById('modal-title').innerText = 'Edit Customer';
    document.getElementById('cust-id').value = c.cust_id;
    document.getElementById('cust-name').value = c.name;
    document.getElementById('cust-phone').value = c.phone;
    document.getElementById('cust-email').value = c.email || '';
    document.getElementById('cust-address').value = c.address || '';

    loadAreas().then(() => {
        document.getElementById('cust-area').value = c.area_id;
    });

    document.getElementById('customer-modal').style.display = 'flex';
}


// --- Restaurants & Menu ---

async function loadRestaurants() {
    try {
        const res = await fetch(`${API_URL}/restaurants`);
        const restaurants = await res.json();
        const grid = document.getElementById('restaurant-list');
        grid.innerHTML = '';
        restaurants.forEach(r => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="font-size:2rem; color:var(--accent); margin-bottom:1rem;"><i class="fa-solid fa-utensils"></i></div>
                <h2>${r.rest_name}</h2>
                <p style="margin-top:0.5rem; color:var(--text-secondary);">Area ID: ${r.area_id}</p>
                <div style="margin-top:1rem; text-align:right; font-size:0.9rem; color:var(--accent);">View Menu <i class="fa-solid fa-arrow-right"></i></div>
            `;
            card.onclick = () => loadMenu(r.rest_id, r.rest_name);
            grid.appendChild(card);
        });
    } catch (err) { showToast('Error loading restaurants', 'error'); }
}

let currentRestId = null;
let currentCart = [];

async function loadMenu(restId, restName, category = 'All') {
    currentRestId = restId;
    currentCart = [];
    updateCartUI();

    document.getElementById('restaurant-list').classList.add('hidden');
    document.getElementById('menu-view').classList.remove('hidden');
    document.getElementById('menu-title').innerText = `${restName}`;

    try {
        const res = await fetch(`${API_URL}/menu/${restId}?category=${category}`);
        const items = await res.json();

        if (category === 'All') {
            const categories = ['All', ...new Set(items.map(i => i.category))];
            const filterDiv = document.getElementById('menu-filters');
            filterDiv.innerHTML = '';
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'btn-secondary';
                btn.style.padding = '0.3rem 0.8rem';
                btn.style.fontSize = '0.8rem';
                btn.innerText = cat;
                btn.onclick = () => loadMenu(restId, restName, cat);
                filterDiv.appendChild(btn);
            });
        }

        const tbody = document.getElementById('menu-list');
        tbody.innerHTML = '';
        items.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:600">${item.item_name}</td>
                    <td><span style="background:rgba(255,255,255,0.1); padding:0.2rem 0.5rem; border-radius:0.5rem; font-size:0.8rem">${item.category}</span></td>
                    <td>$${item.price}</td>
                    <td>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn-primary" style="padding:0.4rem 0.8rem; font-size:0.9rem" onclick="addToCart(${item.item_id}, '${item.item_name}', ${item.price})"><i class="fa-solid fa-plus"></i></button>
                            <button class="btn-primary" style="padding:0.4rem 0.8rem; font-size:0.9rem; background:var(--danger);" onclick="deleteItem(${item.item_id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (err) { console.error(err); }
}

function hideMenu() {
    document.getElementById('menu-view').classList.add('hidden');
    document.getElementById('restaurant-list').classList.remove('hidden');
}

async function deleteItem(id) {
    if (!confirm('Delete this item?')) return;
    try {
        const res = await fetch(`${API_URL}/menu/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Item deleted');
            loadMenu(currentRestId, document.getElementById('menu-title').innerText);
        } else { showToast('Failed to delete', 'error'); }
    } catch (err) { console.error(err); }
}

const itemForm = document.getElementById('add-item-form');
if (itemForm) {
    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const item = {
            rest_id: currentRestId,
            item_name: document.getElementById('item-name').value,
            price: document.getElementById('item-price').value,
            category: document.getElementById('item-category').value
        };
        try {
            const res = await fetch(`${API_URL}/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (res.ok) {
                closeModal('add-item-modal');
                e.target.reset();
                showToast('Item added');
                loadMenu(currentRestId, document.getElementById('menu-title').innerText);
            } else { showToast('Failed to add item', 'error'); }
        } catch (e) { console.error(e); }
    });
}

window.addToCart = function (id, name, price) {
    const existing = currentCart.find(i => i.item_id === id);
    if (existing) {
        existing.quantity++;
    } else {
        currentCart.push({ item_id: id, name, price, quantity: 1 });
    }
    updateCartUI();
    showToast(`Added ${name} to cart`);
};

function updateCartUI() {
    const list = document.getElementById('cart-items');
    if (currentCart.length === 0) {
        list.innerHTML = '<p class="empty-cart" style="color:var(--text-secondary); text-align:center; padding:1rem;">Your cart is empty</p>';
        document.getElementById('cart-total').innerText = '$0.00';
        return;
    }

    let total = 0;
    list.innerHTML = '';
    currentCart.forEach(i => {
        const itemTotal = i.price * i.quantity;
        total += itemTotal;
        list.innerHTML += `
            <div class="cart-item">
                <div>
                    <span style="color:var(--accent); font-weight:600;">${i.quantity}x</span> ${i.name}
                </div>
                <span>$${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });
    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
}

async function placeOrder() {
    const custId = document.getElementById('order-cust-id').value;
    if (!custId) return showToast('Please enter Customer ID', 'error');
    if (currentCart.length === 0) return showToast('Cart is empty!', 'error');

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cust_id: custId,
                rest_id: currentRestId,
                items: currentCart
            })
        });

        if (res.ok) {
            showToast('Order placed successfully!', 'success');
            currentCart = [];
            updateCartUI();
            hideMenu();
            showSection('orders');
        } else {
            showToast('Failed to place order', 'error');
        }
    } catch (err) { showToast('Server error', 'error'); }
}


// --- Delivery ---

async function loadDelivery() {
    try {
        const [couriersRes, ordersRes] = await Promise.all([
            fetch(`${API_URL}/delivery`),
            fetch(`${API_URL}/orders`)
        ]);
        const couriers = await couriersRes.json();
        const orders = await ordersRes.json();

        // 1. Render Courier Grid
        const grid = document.getElementById('delivery-grid');
        if (grid) {
            grid.innerHTML = '';
            couriers.forEach(d => {
                const statusClass = d.available ? 'status-active' : 'status-inactive';
                const statusText = d.available ? 'Active' : 'Offline';
                const card = document.createElement('div');
                card.className = 'card driver-card';
                card.style.position = 'relative';
                if (d.available) card.style.border = '1px solid var(--accent)';

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div class="icon-box ${d.available ? 'green' : 'red'}" style="width:50px; height:50px; font-size:1.5rem;">
                            <i class="fa-solid fa-motorcycle"></i>
                        </div>
                        <label class="switch">
                            <input type="checkbox" ${d.available ? 'checked' : ''} onchange="toggleAvailability(${d.D_id}, this.checked)">
                            <span class="slider round"></span>
                        </label>
                    </div>
                    <h3 style="margin-top:1rem;">${d.name}</h3>
                    <p style="color:var(--text-secondary); font-size:0.9rem;">${d.phone}</p>
                    <div style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center;">
                        <span style="background:rgba(255,255,255,0.1); padding:0.2rem 0.6rem; border-radius:1rem; font-size:0.8rem;">Area: ${d.area_id}</span>
                        <span style="font-weight:bold; color:${d.available ? 'var(--success)' : 'var(--danger)'}">${statusText}</span>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // 2. Render Pending Orders
        const pendingList = document.getElementById('delivery-orders-list');
        if (pendingList) {
            const pending = orders.filter(o => o.status !== 'Completed');
            pendingList.innerHTML = '';

            if (pending.length === 0) {
                pendingList.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">No pending orders</p>';
            } else {
                pending.forEach(o => {
                    pendingList.innerHTML += `
                        <div style="padding:1rem; border-bottom:1px solid var(--border); margin-bottom:0.5rem;">
                            <div style="display:flex; justify-content:space-between;">
                                <span style="font-weight:bold; color:var(--accent);">#${o.order_id}</span>
                                <span style="font-size:0.8rem; background:rgba(255,165,0,0.2); color:orange; padding:0.1rem 0.4rem; border-radius:1rem;">${o.status}</span>
                            </div>
                            <p style="margin:0.2rem 0;">${o.restaurant_name}</p>
                            <p style="font-size:0.8rem; color:var(--text-secondary);">Dest: ${o.customer_name}</p>
                        </div>
                    `;
                });
            }
        }

    } catch (err) { console.error(err); showToast('Error loading delivery info', 'error'); }
}

async function toggleAvailability(id, status) {
    try {
        await fetch(`${API_URL}/delivery/${id}/availability`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ available: status })
        });
        showToast('Status updated');
        loadDelivery();
    } catch (err) { console.error(err); }
}


// --- Common ---

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '<i class="fa-solid fa-check-circle" style="color:var(--success)"></i>' : '<i class="fa-solid fa-circle-exclamation" style="color:var(--danger)"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
    if (id === 'customer-modal') {
        // Reset if adding new
        if (document.getElementById('modal-title').innerText !== 'Edit Customer') {
            document.querySelector('#add-customer-form').reset();
            document.getElementById('cust-id').value = '';
        }
        loadAreas();
    }
}
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    if (id === 'customer-modal') document.getElementById('modal-title').innerText = 'Add New Customer';
}

async function updateOrderStatus(id, status) {
    try {
        const res = await fetch(`${API_URL}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            showToast(`Order #${id} marked as ${status}`);
            loadOrders();
        } else {
            showToast('Failed to update status', 'error');
        }
    } catch (err) { console.error(err); }
}

async function loadAreas() {
    try {
        const res = await fetch(`${API_URL}/areas`);
        const areas = await res.json();
        const select = document.getElementById('cust-area');
        // Keep selected value if exists
        const val = select.value;
        select.innerHTML = '<option value="" disabled selected>Select Area</option>';
        areas.forEach(a => {
            select.innerHTML += `<option value="${a.area_id}">${a.area_name}</option>`;
        });
        if (val) select.value = val;
    } catch (err) { console.error('Error loading areas'); }
}

// Initialize Listeners
function setupEventListeners() {
    const addCustForm = document.getElementById('add-customer-form');
    if (addCustForm) {
        addCustForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Submitting customer form...');
            const id = document.getElementById('cust-id').value;
            const customer = {
                name: document.getElementById('cust-name').value,
                phone: document.getElementById('cust-phone').value,
                email: document.getElementById('cust-email').value,
                address: document.getElementById('cust-address').value,
                area_id: document.getElementById('cust-area').value
            };

            try {
                let url = `${API_URL}/customers`;
                let method = 'POST';
                if (id) {
                    url = `${API_URL}/customers/${id}`;
                    method = 'PUT';
                }

                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customer)
                });
                if (res.ok) {
                    closeModal('customer-modal');
                    loadCustomers();
                    e.target.reset();
                    showToast(id ? 'Customer updated' : 'Customer added');
                } else {
                    const data = await res.json();
                    showToast(data.error || 'Failed to save', 'error');
                }
            } catch (err) { console.error(err); }
        });
    }

    const itemForm = document.getElementById('add-item-form');
    if (itemForm) {
        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Submitting item form...');
            const item = {
                rest_id: currentRestId,
                item_name: document.getElementById('item-name').value,
                price: document.getElementById('item-price').value,
                category: document.getElementById('item-category').value
            };
            try {
                const res = await fetch(`${API_URL}/menu`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
                if (res.ok) {
                    closeModal('add-item-modal');
                    e.target.reset();
                    showToast('Item added');
                    loadMenu(currentRestId, document.getElementById('menu-title').innerText);
                } else { showToast('Failed to add item', 'error'); }
            } catch (e) { console.error(e); }
        });
    }
}

// Call setup
document.addEventListener('DOMContentLoaded', setupEventListeners);

// --- Expose for HTML access ---
window.toggleAuthMode = toggleAuthMode;
window.logout = logout;
window.loadCustomers = loadCustomers;
window.searchCustomers = searchCustomers;
window.viewHistory = viewHistory;
window.openEditModal = openEditModal;
window.deleteCustomer = deleteCustomer;
window.loadMenu = loadMenu;
window.hideMenu = hideMenu;
window.deleteItem = deleteItem;
window.addToCart = addToCart;
window.placeOrder = placeOrder;
window.toggleAvailability = toggleAvailability;
window.openModal = openModal;
window.closeModal = closeModal;
window.updateOrderStatus = updateOrderStatus;
