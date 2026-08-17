// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const orders = require('./routes/data'); // shared in-memory order array

const app = express();
const server = http.createServer(app);
const io = new Server(server); // define io for socket.io

// require and pass io to printRoutes (keeps your existing structure)
const printRoutes = require('./routes/printRoutes')(io);

const port = 3000;

// Middleware
app.use(express.json());
// Add urlencoded parser as a safe fallback so req.body won't be undefined
app.use(express.urlencoded({ extended: true }));

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

// Admin credentials (kept as you had them)
const ADMIN_USER = "shaiksanah";
const ADMIN_PASS = "muzraan";
const ADMIN_TOKEN = "secret123";

// Food order submission
app.post('/order', (req, res) => {
  const { name, email, items, total } = req.body || {};

  if (!name || !email || !Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
    return res.status(400).json({ error: "Missing or invalid order details" });
  }

  const newOrder = {
    name,
    email,
    items,
    total,
    time: new Date().toLocaleString(),
    type: "food"
  };

  orders.push(newOrder);
  io.emit("new-order", newOrder); // Emit order via socket.io
  return res.json({ message: "Order received successfully!" });
});

// Admin route to get all orders (requires token)
app.get('/admin/orders', (req, res) => {
  const token = req.query.token;
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.json(orders);
});

// Admin login
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};

  // Defensive check: if body missing, return clear JSON error
  if (typeof username === 'undefined' || typeof password === 'undefined') {
    return res.status(400).json({ success: false, error: "Missing username or password" });
  }

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    return res.json({ success: false });
  }
});

// Attach print routes after io is defined
app.use('/', printRoutes);

// Serve homepage (keeps same behavior)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generic 404 JSON for API-like routes to avoid HTML 404 parsing issues in client
app.use((req, res, next) => {
  // If request wants JSON or is an API/admin route, return JSON 404
  if (req.path.startsWith('/admin') || req.path.startsWith('/order') || req.headers.accept?.includes('application/json')) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
});

// Start the server
server.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
