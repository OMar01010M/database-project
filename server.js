const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./database');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---

// 1. Authentication
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        // Generate ID
        const [result] = await db.query('SELECT MAX(user_id) as maxId FROM USERS');
        const newId = (result[0].maxId || 0) + 1;

        await db.query(
            'INSERT INTO USERS (user_id, username, password_hash) VALUES (?, ?, SHA2(?, 256))',
            [newId, username, password]
        );
        res.status(201).json({ message: 'User registered', userId: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query(
            'SELECT * FROM USERS WHERE username = ? AND password_hash = SHA2(?, 256)',
            [username, password]
        );
        if (users.length > 0) {
            res.json({ message: 'Login successful', user: { id: users[0].user_id, username: users[0].username } });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// 2. Customers
// Search Customers
app.get('/api/customers/search', async (req, res) => {
    const { q } = req.query;
    try {
        const [rows] = await db.query('SELECT * FROM CUSTOMER WHERE name LIKE ?', [`%${q}%`]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get all customers
app.get('/api/customers', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM CUSTOMER');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Add a customer (with duplicate email check)
app.post('/api/customers', async (req, res) => {
    const { name, phone, email, address, area_id } = req.body;
    try {
        const [result] = await db.query('SELECT MAX(cust_id) as maxId FROM CUSTOMER');
        const newId = (result[0].maxId || 0) + 1;

        await db.query(
            'INSERT INTO CUSTOMER (cust_id, name, phone, email, address, area_id, is_premium) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newId, name, phone, email, address, area_id, false]
        );
        res.status(201).json({ message: 'Customer added', id: newId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Customer History
app.get('/api/customers/:id/history', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT o.order_id, r.rest_name, o.order_date, o.status, o.total 
            FROM ORDERS o
            JOIN RESTAURANT r ON o.rest_id = r.rest_id
            WHERE o.cust_id = ?
            ORDER BY o.order_date DESC
        `, [id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});




// Update Customer
app.put('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address, area_id } = req.body;
    try {
        await db.query(
            'UPDATE CUSTOMER SET name=?, phone=?, email=?, address=?, area_id=? WHERE cust_id=?',
            [name, phone, email, address, area_id, id]
        );
        res.json({ message: 'Customer updated' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete Customer
app.delete('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM CUSTOMER WHERE cust_id = ?', [id]);
        res.json({ message: 'Customer deleted' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'Cannot delete: Customer has orders' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});


// 3. Restaurants & Menu
app.get('/api/restaurants', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM RESTAURANT');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/menu/:rest_id', async (req, res) => {
    const { rest_id } = req.params;
    const { category } = req.query;
    try {
        let sql = 'SELECT * FROM MENU WHERE rest_id = ?';
        const params = [rest_id];

        if (category && category !== 'All') {
            sql += ' AND category = ?';
            params.push(category);
        }

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Add Menu Item
app.post('/api/menu', async (req, res) => {
    const { rest_id, item_name, price, category } = req.body;
    try {
        const [result] = await db.query('SELECT MAX(item_id) as maxId FROM MENU');
        const newId = (result[0].maxId || 0) + 1;
        await db.query(
            'INSERT INTO MENU (item_id, rest_id, item_name, price, category) VALUES (?, ?, ?, ?, ?)',
            [newId, rest_id, item_name, price, category]
        );
        res.status(201).json({ message: 'Item added', id: newId });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete Menu Item
app.delete('/api/menu/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM MENU WHERE item_id = ?', [id]);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});


// 4. Delivery
// Get all delivery staff (including availability)
app.get('/api/delivery', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM DELIVERY');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Toggle availability
app.put('/api/delivery/:id/availability', async (req, res) => {
    const { id } = req.params;
    const { available } = req.body;
    try {
        await db.query('UPDATE DELIVERY SET available = ? WHERE D_id = ?', [available, id]);
        res.json({ message: 'Availability updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get available couriers (using VIEW)
app.get('/api/delivery/available-view', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM AVAILABLE_DELIVERY');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// 5. Areas (Dropdowns)
app.get('/api/areas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM AREA');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// 6. Orders
app.post('/api/orders', async (req, res) => {
    const { cust_id, rest_id, items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in order' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Generate Order ID
        const [orderRes] = await connection.query('SELECT MAX(order_id) as maxId FROM ORDERS');
        const newOrderId = (orderRes[0].maxId || 0) + 1;

        let total = 0;
        for (const item of items) {
            const [menuItem] = await connection.query('SELECT price FROM MENU WHERE item_id = ?', [item.item_id]);
            if (menuItem.length > 0) {
                total += menuItem[0].price * item.quantity;
            }
        }

        await connection.query(
            'INSERT INTO ORDERS (order_id, cust_id, rest_id, order_date, status, total) VALUES (?, ?, ?, NOW(), ?, ?)',
            [newOrderId, cust_id, rest_id, 'Pending', total]
        );

        for (const item of items) {
            await connection.query(
                'INSERT INTO ORDER_ITEM (order_id, item_id, quantity) VALUES (?, ?, ?)',
                [newOrderId, item.item_id, item.quantity]
            );
        }

        // Check for Premium Upgrade
        const [spendRes] = await connection.query('SELECT SUM(total) as val FROM ORDERS WHERE cust_id = ?', [cust_id]);
        const totalSpent = spendRes[0].val || 0;

        let upgraded = false;
        if (totalSpent > 1000) {
            await connection.query('UPDATE CUSTOMER SET is_premium = TRUE WHERE cust_id = ?', [cust_id]);
            upgraded = true;
        }

        await connection.commit();
        res.status(201).json({ message: 'Order placed', order_id: newOrderId, total, upgraded });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Transaction failed' });
    } finally {
        connection.release();
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const query = `
            SELECT 
                o.order_id, 
                c.name as customer_name, 
                r.rest_name as restaurant_name, 
                o.order_date, 
                o.status, 
                o.total 
            FROM ORDERS o
            JOIN CUSTOMER c ON o.cust_id = c.cust_id
            JOIN RESTAURANT r ON o.rest_id = r.rest_id
            ORDER BY o.order_date DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE ORDERS SET status = ? WHERE order_id = ?', [status, id]);
        res.json({ message: 'Order status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});


// --- Export Features ---

app.get('/api/export/json', async (req, res) => {
    try {
        const [customers] = await db.query('SELECT * FROM CUSTOMER');
        const [orders] = await db.query('SELECT * FROM ORDERS');

        const data = {
            timestamp: new Date(),
            customers: customers,
            orders: orders
        };

        res.header('Content-Type', 'application/json');
        res.attachment('restaurant_data.json');
        res.send(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Export failed' });
    }
});

app.get('/api/export/csv', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.order_id, c.name, r.rest_name, o.order_date, o.total 
            FROM ORDERS o
            JOIN CUSTOMER c ON o.cust_id = c.cust_id
            JOIN RESTAURANT r ON o.rest_id = r.rest_id
        `);

        // Convert to CSV string
        const headers = ['Order ID', 'Customer Name', 'Restaurant', 'Date', 'Total'];
        const csvRows = [headers.join(',')];

        orders.forEach(row => {
            csvRows.push([
                row.order_id,
                `"${row.name}"`,
                `"${row.rest_name}"`,
                new Date(row.order_date).toISOString().split('T')[0],
                row.total
            ].join(','));
        });

        res.header('Content-Type', 'text/csv');
        res.attachment('orders_export.csv');
        res.send(csvRows.join('\n'));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Export failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
