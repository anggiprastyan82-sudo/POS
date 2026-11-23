import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("kasir.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    cost_price INTEGER NOT NULL,
    selling_price INTEGER NOT NULL,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_amount INTEGER NOT NULL,
    payment_method_id INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(payment_method_id) REFERENCES payment_methods(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Initial Data
  INSERT OR IGNORE INTO payment_methods (name) VALUES ('Tunai'), ('QRIS BNI'), ('QRIS Shopee');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('business_name', 'Kasir Pintar');
`);

const app = express();
app.use(express.json());

// API Routes
app.get("/api/categories", (req, res) => {
  const rows = db.prepare("SELECT * FROM categories").all();
  res.json(rows);
});

app.post("/api/categories", (req, res) => {
  const { name } = req.body;
  try {
    const info = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
    res.json({ id: info.lastInsertRowid, name });
  } catch (err) {
    res.status(400).json({ error: "Category already exists" });
  }
});

app.get("/api/products", (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `).all();
  res.json(rows);
});

app.post("/api/products", (req, res) => {
  const { name, category_id, cost_price, selling_price, stock, image_url } = req.body;
  const info = db.prepare(`
    INSERT INTO products (name, category_id, cost_price, selling_price, stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, category_id, cost_price, selling_price, stock, image_url);
  res.json({ id: info.lastInsertRowid, ...req.body });
});

app.get("/api/expenses", (req, res) => {
  const rows = db.prepare("SELECT * FROM expenses ORDER BY date DESC").all();
  res.json(rows);
});

app.post("/api/expenses", (req, res) => {
  const { description, amount } = req.body;
  const info = db.prepare("INSERT INTO expenses (description, amount) VALUES (?, ?)").run(description, amount);
  res.json({ id: info.lastInsertRowid, description, amount });
});

app.get("/api/payment-methods", (req, res) => {
  const rows = db.prepare("SELECT * FROM payment_methods").all();
  res.json(rows);
});

app.post("/api/payment-methods", (req, res) => {
  const { name } = req.body;
  try {
    const info = db.prepare("INSERT INTO payment_methods (name) VALUES (?)").run(name);
    res.json({ id: info.lastInsertRowid, name });
  } catch (err) {
    res.status(400).json({ error: "Payment method already exists" });
  }
});

app.post("/api/sales", (req, res) => {
  const { total_amount, payment_method_id, items } = req.body;
  
  const transaction = db.transaction(() => {
    const saleInfo = db.prepare("INSERT INTO sales (total_amount, payment_method_id) VALUES (?, ?)").run(total_amount, payment_method_id);
    const saleId = saleInfo.lastInsertRowid;

    for (const item of items) {
      db.prepare("INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)").run(saleId, item.product_id, item.quantity, item.price);
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.product_id);
    }
    return saleId;
  });

  const saleId = transaction();
  res.json({ id: saleId });
});

app.get("/api/reports/dashboard", (req, res) => {
  const sales = db.prepare(`
    SELECT date(date) as day, SUM(total_amount) as total 
    FROM sales 
    WHERE date >= date('now', '-7 days')
    GROUP BY day
  `).all();

  const expenses = db.prepare(`
    SELECT date(date) as day, SUM(amount) as total 
    FROM expenses 
    WHERE date >= date('now', '-7 days')
    GROUP BY day
  `).all();

  const topProducts = db.prepare(`
    SELECT p.name, SUM(si.quantity) as sold
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    GROUP BY p.id
    ORDER BY sold DESC
    LIMIT 5
  `).all();

  res.json({ sales, expenses, topProducts });
});

app.get("/api/reports/sales", (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, pm.name as payment_method_name
    FROM sales s
    LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
    ORDER BY s.date DESC
  `).all();
  res.json(rows);
});

app.get("/api/settings", (req, res) => {
  const rows = db.prepare("SELECT * FROM settings").all();
  const settings = rows.reduce((acc: any, row: any) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  res.json(settings);
});

app.post("/api/settings", (req, res) => {
  const { key, value } = req.body;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
  res.json({ success: true });
});

// Vite Middleware
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
