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

// API Routes

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

// Add a customer
app.post('/api/customers', async (req, res) => {
    const { name, phone, email, address, area_id } = req.body;
    try {
        // Assuming cust_id is not auto-increment in the SQL provided (it's just INT PRIMARY KEY), 
        // we might need to handle ID generation or the user should provide it. 
        // Let's check the SQL again. The INSERT example uses explicit ID.
        // For now, I'll calculate the next ID or let the user provide it. 
        // Ideally, it should be AUTO_INCREMENT. 
        // I will auto-generate a random ID for now to simplify, or find max.

        // Finding max ID to increment
        const [result] = await db.query('SELECT MAX(cust_id) as maxId FROM CUSTOMER');
        const newId = (result[0].maxId || 0) + 1;

        await db.query(
            'INSERT INTO CUSTOMER (cust_id, name, phone, email, address, area_id, is_premium) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newId, name, phone, email, address, area_id, false]
        );
        res.status(201).json({ message: 'Customer added', id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get all restaurants
app.get('/api/restaurants', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM RESTAURANT');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get menu for a restaurant
app.get('/api/menu/:rest_id', async (req, res) => {
    const { rest_id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM MENU WHERE rest_id = ?', [rest_id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get all areas
app.get('/api/areas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM AREA');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create an order
app.post('/api/orders', async (req, res) => {
    const { cust_id, rest_id, items } = req.body; // items = [{ item_id, quantity }]

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in order' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create Order
        // Generate Order ID
        const [orderRes] = await connection.query('SELECT MAX(order_id) as maxId FROM ORDERS');
        const newOrderId = (orderRes[0].maxId || 0) + 1;

        // Calculate total (simplified, better to calc from DB prices, but trusting frontend/param for now or basic calc)
        // Actually, let's fetch prices to be safe, but for speed, I'll assume 0 and update later or just sum it up if passed.
        // Let's do it properly: fetch item prices.
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

        // 2. Add Order Items
        for (const item of items) {
            await connection.query(
                'INSERT INTO ORDER_ITEM (order_id, item_id, quantity) VALUES (?, ?, ?)',
                [newOrderId, item.item_id, item.quantity]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Order placed', order_id: newOrderId, total });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Transaction failed' });
    } finally {
        connection.release();
    }
});

// Get all orders
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

// --- Export Features ---

// Export to JSON
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

// Export to CSV
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
