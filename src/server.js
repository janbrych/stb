const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'brych-taxi-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: 'Není povoleno. Pouze pro přihlášeného správce.' });
}

// AUTH ENDPOINTS
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Prosím zadejte e-mail a heslo.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()], (err, user) => {
    if (err) return res.status(500).json({ error: 'Chyba databáze' });
    if (!user) return res.status(401).json({ error: 'Neplatný e-mail nebo heslo.' });

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Neplatný e-mail nebo heslo.' });

    req.session.isAdmin = true;
    req.session.userEmail = user.email;
    return res.json({ success: true, email: user.email });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ isAdmin: true, email: req.session.userEmail });
  }
  return res.json({ isAdmin: false });
});

// PASSENGERS ENDPOINTS
app.get('/api/passengers', (req, res) => {
  db.all('SELECT * FROM passengers ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Chyba databáze' });
    res.json(rows);
  });
});

app.post('/api/passengers', requireAdmin, (req, res) => {
  const { name, default_price } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Jméno cestujícího je povinné.' });
  }

  const price = parseFloat(default_price) || 0;
  db.run('INSERT INTO passengers (name, default_price) VALUES (?, ?)', [name.trim(), price], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Cestující s tímto jménem již existuje.' });
      }
      return res.status(500).json({ error: 'Chyba databáze při vytváření cestujícího.' });
    }
    res.json({ id: this.lastID, name: name.trim(), default_price: price });
  });
});

app.put('/api/passengers/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, default_price } = req.body;

  db.run('UPDATE passengers SET name = ?, default_price = ? WHERE id = ?', [name, default_price, id], function(err) {
    if (err) return res.status(500).json({ error: 'Chyba při aktualizaci cestujícího.' });
    res.json({ success: true });
  });
});

app.delete('/api/passengers/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM passengers WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: 'Chyba při mazání cestujícího.' });
    res.json({ success: true });
  });
});

// RIDES ENDPOINTS
// Get all rides for a specific year_month (e.g., '2025-02') or date
app.get('/api/rides', (req, res) => {
  const { month, date } = req.query;
  if (date) {
    db.all('SELECT * FROM rides WHERE ride_date = ?', [date], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Chyba databáze' });
      res.json(rows);
    });
  } else if (month) {
    db.all('SELECT * FROM rides WHERE ride_date LIKE ?', [`${month}-%`], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Chyba databáze' });
      res.json(rows);
    });
  } else {
    db.all('SELECT * FROM rides', [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Chyba databáze' });
      res.json(rows);
    });
  }
});

// Save/update rides for a specific date across passengers
// body: { date: 'YYYY-MM-DD', rides: [{ passenger_id: 1, direction: 'TO_SCHOOL' | 'FROM_SCHOOL' | 'BOTH' | 'NONE' }] }
app.post('/api/rides/bulk', requireAdmin, (req, res) => {
  const { date, rides } = req.body;
  if (!date || !Array.isArray(rides)) {
    return res.status(400).json({ error: 'Neplatná data.' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const deleteStmt = db.prepare('DELETE FROM rides WHERE passenger_id = ? AND ride_date = ?');
    const insertStmt = db.prepare('INSERT INTO rides (passenger_id, ride_date, direction) VALUES (?, ?, ?)');

    rides.forEach(item => {
      deleteStmt.run(item.passenger_id, date);
      if (item.direction && item.direction !== 'NONE') {
        insertStmt.run(item.passenger_id, date, item.direction);
      }
    });

    deleteStmt.finalize();
    insertStmt.finalize();

    db.run('COMMIT', (err) => {
      if (err) return res.status(500).json({ error: 'Chyba při ukládání jízd.' });
      res.json({ success: true });
    });
  });
});

// MONTHLY SETTINGS ENDPOINTS
// Get monthly settings for a year_month (prices & payment statuses)
app.get('/api/monthly-status', (req, res) => {
  const { month } = req.query; // YYYY-MM
  if (!month) return res.status(400).json({ error: 'Chybí parametr month.' });

  const query = `
    SELECT p.id as passenger_id, p.name, p.default_price,
           m.price_per_ride, m.is_paid
    FROM passengers p
    LEFT JOIN monthly_settings m ON p.id = m.passenger_id AND m.year_month = ?
  `;

  db.all(query, [month], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Chyba databáze' });
    res.json(rows);
  });
});

// Update monthly setting for a passenger
// body: { passenger_id, year_month, price_per_ride, is_paid }
app.post('/api/monthly-status', requireAdmin, (req, res) => {
  const { passenger_id, year_month, price_per_ride, is_paid } = req.body;
  if (!passenger_id || !year_month) {
    return res.status(400).json({ error: 'Chybí povinná data.' });
  }

  // Get current settings first
  db.get('SELECT * FROM monthly_settings WHERE passenger_id = ? AND year_month = ?', [passenger_id, year_month], (err, row) => {
    if (err) return res.status(500).json({ error: 'Chyba databáze' });

    const newPrice = price_per_ride !== undefined ? parseFloat(price_per_ride) : (row ? row.price_per_ride : null);
    const newPaid = is_paid !== undefined ? (is_paid ? 1 : 0) : (row ? row.is_paid : 0);

    db.run(`
      INSERT INTO monthly_settings (passenger_id, year_month, price_per_ride, is_paid)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(passenger_id, year_month) DO UPDATE SET
        price_per_ride = excluded.price_per_ride,
        is_paid = excluded.is_paid
    `, [passenger_id, year_month, newPrice, newPaid], (err) => {
      if (err) return res.status(500).json({ error: 'Chyba při ukládání měsíčního nastavení.' });

      // Also update default_price on passenger if price was updated, so subsequent months get this default price
      if (newPrice !== null && !isNaN(newPrice)) {
        db.run('UPDATE passengers SET default_price = ? WHERE id = ?', [newPrice, passenger_id]);
      }

      res.json({ success: true });
    });
  });
});

// Route fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Brych Taxi Server běží na portu ${PORT}`);
});
