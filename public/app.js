const API_URL = 'http://localhost:3000/api';

// --- UI Navigation ---

function enterDashboard() {
    document.getElementById('landing-page').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        loadDashboardStats(); // Refresh stats on entry
    }, 500);
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (id === 'customers') loadCustomers();
    if (id === 'restaurants') loadRestaurants();
    if (id === 'orders') loadOrders();
    if (id === 'dashboard') loadDashboardStats();
}

// --- Dashboard Stats ---
async function loadDashboardStats() {
    // Quick fetches to update counters
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
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}


// --- Data Loading ---

async function loadCustomers() {
    try {
        const res = await fetch(`${API_URL}/customers`);
        const customers = await res.json();
        const tbody = document.getElementById('customer-list');
        tbody.innerHTML = '';
        customers.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>#${c.cust_id}</td>
                    <td style="font-weight:600">${c.name}</td>
                    <td>${c.phone}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.area_id}</td>
                    <td>${c.is_premium ? '<span style="color:var(--accent)">Premium</span>' : 'Standard'}</td>
                </tr>
            `;
        });
    } catch (err) { showToast('Error loading customers', 'error'); }
}

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

async function loadOrders() {
    try {
        const res = await fetch(`${API_URL}/orders`);
        const orders = await res.json();
        const tbody = document.getElementById('order-list');
        tbody.innerHTML = '';
        orders.forEach(o => {
            const date = new Date(o.order_date).toLocaleDateString();
            let statusColor = '#f59e0b';
            let actionBtn = '';

            if (o.status === 'Completed') {
                statusColor = '#22c55e';
                actionBtn = '<span style="color:var(--text-secondary); font-size:0.8rem;"><i class="fa-solid fa-check"></i> Done</span>';
            } else {
                actionBtn = `<button class="btn-primary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="updateOrderStatus(${o.order_id}, 'Completed')">Mark Done</button>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>#${o.order_id}</td>
                    <td>${o.customer_name}</td>
                    <td>${o.restaurant_name}</td>
                    <td>${date}</td>
                    <td><span style="padding:0.25rem 0.75rem; border-radius:1rem; background: ${statusColor}20; color:${statusColor}; font-size:0.85rem; font-weight:600;">${o.status}</span></td>
                    <td>$${o.total}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    } catch (err) { showToast('Error loading orders', 'error'); }
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
            loadDashboardStats();
        } else {
            showToast('Failed to update status', 'error');
        }
    } catch (err) { console.error(err); }
}

// --- Menu & Cart Logic ---

let currentCart = [];
let currentRestId = null;
let currentCustomerId = 1;

async function loadMenu(restId, restName) {
    currentRestId = restId;
    currentCart = [];
    updateCartUI();

    document.getElementById('restaurant-list').classList.add('hidden');
    document.getElementById('menu-view').classList.remove('hidden');
    document.getElementById('menu-title').innerText = `${restName} - Menu`;

    try {
        const res = await fetch(`${API_URL}/menu/${restId}`);
        const items = await res.json();
        const tbody = document.getElementById('menu-list');
        tbody.innerHTML = '';
        items.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:600">${item.item_name}</td>
                    <td><span style="background:rgba(255,255,255,0.1); padding:0.2rem 0.5rem; border-radius:0.5rem; font-size:0.8rem">${item.category}</span></td>
                    <td>$${item.price}</td>
                    <td><button class="btn-primary" style="padding:0.4rem 0.8rem; font-size:0.9rem" onclick="addToCart(${item.item_id}, '${item.item_name}', ${item.price})"><i class="fa-solid fa-plus"></i></button></td>
                </tr>
            `;
        });
    } catch (err) { console.error(err); }
}

function hideMenu() {
    document.getElementById('menu-view').classList.add('hidden');
    document.getElementById('restaurant-list').classList.remove('hidden');
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

window.placeOrder = async function () {
    if (currentCart.length === 0) return showToast('Cart is empty!', 'error');

    const orderData = {
        cust_id: currentCustomerId,
        rest_id: currentRestId,
        items: currentCart
    };

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
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
    } catch (err) {
        showToast('Server error', 'error');
    }
};


// --- Utilities ---

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

// Modals
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
    if (id === 'customer-modal') loadAreas(); // Load areas when opening
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function loadAreas() {
    try {
        const res = await fetch(`${API_URL}/areas`);
        const areas = await res.json();
        const select = document.getElementById('cust-area');
        // Keep first option
        select.innerHTML = '<option value="" disabled selected>Select Area</option>';
        areas.forEach(a => {
            select.innerHTML += `<option value="${a.area_id}">${a.area_name}</option>`;
        });
    } catch (err) { console.error('Error loading areas'); }
}

// Customer Form
document.getElementById('add-customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const customer = {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        email: document.getElementById('cust-email').value,
        address: document.getElementById('cust-address').value,
        area_id: document.getElementById('cust-area').value
    };

    try {
        const res = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer)
        });
        if (res.ok) {
            closeModal('customer-modal');
            loadCustomers();
            e.target.reset();
            showToast('Customer added successfully');
        } else {
            showToast('Failed to add customer', 'error');
        }
    } catch (err) { console.error(err); }
});

// Init
// loadDashboardStats(); // Called when entering dashboard
