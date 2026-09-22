const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, getPassengerPriceForMonth } = require('../db');
const { generateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// --- AUTH ROUTES ---

// POST /api/auth/login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Uvedte e-mail a heslo.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Nespravny e-mail nebo heslo.' });
  }

  const token = generateToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  return res.json({
    message: 'Přihlášení úspěšné.',
    user: { id: user.id, email: user.email, role: user.role },
    token
  });
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Odhlášení úspěšné.' });
});

// GET /api/auth/me
router.get('/auth/me', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ authenticated: false, user: null });
  }
  return res.json({ authenticated: true, user: req.user });
});

// --- PASSENGERS ROUTES ---

// GET /api/passengers
router.get('/passengers', (req, res) => {
  const passengers = db.prepare('SELECT * FROM passengers ORDER BY name ASC').all();
  res.json(passengers);
});

// POST /api/passengers (Admin)
router.post('/passengers', requireAdmin, (req, res) => {
  const { name, default_price, note } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Jméno cestujícího je povinné.' });
  }

  const priceVal = parseFloat(default_price) >= 0 ? parseFloat(default_price) : 50;

  const stmt = db.prepare('INSERT INTO passengers (name, default_price, note) VALUES (?, ?, ?)');
  const info = stmt.run(name.trim(), priceVal, note || null);

  // Set initial price entry for current month
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  db.prepare('INSERT OR REPLACE INTO monthly_prices (passenger_id, year_month, price) VALUES (?, ?, ?)')
    .run(info.lastInsertRowid, currentYearMonth, priceVal);

  const newPassenger = db.prepare('SELECT * FROM passengers WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(newPassenger);
});

// PUT /api/passengers/:id (Admin)
router.put('/passengers/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, note } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Jméno cestujícího je povinné.' });
  }

  const result = db.prepare('UPDATE passengers SET name = ?, note = ? WHERE id = ?').run(name.trim(), note || null, id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Cestující nenalezen.' });
  }

  const updated = db.prepare('SELECT * FROM passengers WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/passengers/:id (Admin)
router.delete('/passengers/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM passengers WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Cestující nenalezen.' });
  }
  res.json({ message: 'Cestující byl smazán.' });
});

// --- RIDES ROUTES ---

// GET /api/rides?date=YYYY-MM-DD
router.get('/rides', (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Parametr date je povinný.' });
  }

  const rides = db.prepare('SELECT * FROM rides WHERE date = ?').all(date);
  res.json(rides);
});

// POST /api/rides/daily (Admin)
// Batch update rides for all passengers for a given date
router.post('/rides/daily', requireAdmin, (req, res) => {
  const { date, passengers } = req.body;
  if (!date || !Array.isArray(passengers)) {
    return res.status(400).json({ error: 'Chybí datum nebo seznam cestujících.' });
  }

  const deleteRidesStmt = db.prepare('DELETE FROM rides WHERE passenger_id = ? AND date = ?');
  const insertRideStmt = db.prepare('INSERT INTO rides (passenger_id, date, direction) VALUES (?, ?, ?)');

  const saveTx = db.transaction(() => {
    for (const item of passengers) {
      const { passenger_id, status } = item; // status: 'NIC', 'TAM', 'ZPET', 'OBOJE'
      deleteRidesStmt.run(passenger_id, date);

      if (status === 'TAM') {
        insertRideStmt.run(passenger_id, date, 'TAM');
      } else if (status === 'ZPET') {
        insertRideStmt.run(passenger_id, date, 'ZPET');
      } else if (status === 'OBOJE') {
        insertRideStmt.run(passenger_id, date, 'TAM');
        insertRideStmt.run(passenger_id, date, 'ZPET');
      }
    }
  });

  saveTx();
  res.json({ message: 'Jízdy pro daný den byly uloženy.' });
});

// POST /api/rides/single (Admin)
// Set specific status ('NIC', 'TAM', 'ZPET', 'OBOJE') for 1 passenger on 1 date
router.post('/rides/single', requireAdmin, (req, res) => {
  const { passenger_id, date, status } = req.body;
  if (!passenger_id || !date || !status) {
    return res.status(400).json({ error: 'Chybí povinné údaje.' });
  }

  db.prepare('DELETE FROM rides WHERE passenger_id = ? AND date = ?').run(passenger_id, date);

  if (status === 'TAM') {
    db.prepare('INSERT INTO rides (passenger_id, date, direction) VALUES (?, ?, ?)').run(passenger_id, date, 'TAM');
  } else if (status === 'ZPET') {
    db.prepare('INSERT INTO rides (passenger_id, date, direction) VALUES (?, ?, ?)').run(passenger_id, date, 'ZPET');
  } else if (status === 'OBOJE') {
    db.prepare('INSERT INTO rides (passenger_id, date, direction) VALUES (?, ?, ?)').run(passenger_id, date, 'TAM');
    db.prepare('INSERT INTO rides (passenger_id, date, direction) VALUES (?, ?, ?)').run(passenger_id, date, 'ZPET');
  }

  res.json({ message: 'Jízda byla aktualizována.' });
});

// --- PRICE & PAYMENT MANAGEMENT ---

// POST /api/passengers/:id/price (Admin)
router.post('/passengers/:id/price', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { year_month, price } = req.body;

  if (!year_month || price === undefined || price < 0) {
    return res.status(400).json({ error: 'Neplatné datum nebo cena.' });
  }

  db.prepare(`
    INSERT INTO monthly_prices (passenger_id, year_month, price)
    VALUES (?, ?, ?)
    ON CONFLICT(passenger_id, year_month) DO UPDATE SET price = excluded.price
  `).run(id, year_month, parseFloat(price));

  res.json({ message: 'Cena byla úspěšně aktualizována.', year_month, price: parseFloat(price) });
});

// POST /api/passengers/:id/payment (Admin)
router.post('/passengers/:id/payment', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { year_month, paid } = req.body;

  if (!year_month || paid === undefined) {
    return res.status(400).json({ error: 'Neplatný požadavek.' });
  }

  const paidVal = paid ? 1 : 0;

  db.prepare(`
    INSERT INTO monthly_payments (passenger_id, year_month, paid)
    VALUES (?, ?, ?)
    ON CONFLICT(passenger_id, year_month) DO UPDATE SET paid = excluded.paid
  `).run(id, year_month, paidVal);

  res.json({ message: 'Stav zaplacení byl změněn.', year_month, paid: paidVal });
});

// --- OVERVIEW & SUMMARY ROUTES ---

// GET /api/summary/month?year_month=YYYY-MM
router.get('/summary/month', (req, res) => {
  let { year_month } = req.query;
  if (!year_month) {
    year_month = new Date().toISOString().slice(0, 7);
  }

  const passengers = db.prepare('SELECT * FROM passengers ORDER BY name ASC').all();

  const passengersSummary = passengers.map(p => {
    const rides = db.prepare(`
      SELECT direction FROM rides
      WHERE passenger_id = ? AND date LIKE ?
    `).all(p.id, `${year_month}%`);

    let tam_count = 0;
    let zpet_count = 0;
    rides.forEach(r => {
      if (r.direction === 'TAM') tam_count++;
      if (r.direction === 'ZPET') zpet_count++;
    });

    const total_rides = tam_count + zpet_count;
    const price = getPassengerPriceForMonth(p.id, year_month);
    const total_amount = total_rides * price;

    const payment = db.prepare('SELECT paid FROM monthly_payments WHERE passenger_id = ? AND year_month = ?')
      .get(p.id, year_month);
    const paid = payment ? payment.paid : 0;

    return {
      passenger_id: p.id,
      name: p.name,
      note: p.note,
      tam_count,
      zpet_count,
      total_rides,
      price,
      total_amount,
      paid: Boolean(paid)
    };
  });

  const grand_total_rides = passengersSummary.reduce((sum, item) => sum + item.total_rides, 0);
  const grand_total_amount = passengersSummary.reduce((sum, item) => sum + item.total_amount, 0);
  const grand_total_paid_amount = passengersSummary.reduce((sum, item) => sum + (item.paid ? item.total_amount : 0), 0);
  const grand_total_unpaid_amount = grand_total_amount - grand_total_paid_amount;

  res.json({
    year_month,
    passengers: passengersSummary,
    grand_total_rides,
    grand_total_amount,
    grand_total_paid_amount,
    grand_total_unpaid_amount
  });
});

// GET /api/passengers/:id/detail?year_month=YYYY-MM
router.get('/passengers/:id/detail', (req, res) => {
  const { id } = req.params;
  let { year_month } = req.query;
  if (!year_month) {
    year_month = new Date().toISOString().slice(0, 7);
  }

  const passenger = db.prepare('SELECT * FROM passengers WHERE id = ?').get(id);
  if (!passenger) {
    return res.status(404).json({ error: 'Cestující nenalezen.' });
  }

  // Month rides breakdown
  const monthRides = db.prepare('SELECT date, direction FROM rides WHERE passenger_id = ? AND date LIKE ?')
    .all(id, `${year_month}%`);

  const calendarDays = {};
  let tam_count = 0;
  let zpet_count = 0;

  monthRides.forEach(r => {
    if (!calendarDays[r.date]) {
      calendarDays[r.date] = { tam: false, zpet: false, count: 0 };
    }
    if (r.direction === 'TAM') {
      calendarDays[r.date].tam = true;
      tam_count++;
    }
    if (r.direction === 'ZPET') {
      calendarDays[r.date].zpet = true;
      zpet_count++;
    }
    calendarDays[r.date].count = (calendarDays[r.date].tam ? 1 : 0) + (calendarDays[r.date].zpet ? 1 : 0);
  });

  const total_rides = tam_count + zpet_count;
  const price = getPassengerPriceForMonth(id, year_month);
  const total_amount = total_rides * price;

  const paymentRow = db.prepare('SELECT paid FROM monthly_payments WHERE passenger_id = ? AND year_month = ?')
    .get(id, year_month);
  const paid = paymentRow ? Boolean(paymentRow.paid) : false;

  // Calculate All-time stats for passenger
  const allRides = db.prepare('SELECT date, direction FROM rides WHERE passenger_id = ?').all(id);
  const allTimeTam = allRides.filter(r => r.direction === 'TAM').length;
  const allTimeZpet = allRides.filter(r => r.direction === 'ZPET').length;
  const allTimeRides = allRides.length;

  // Group all rides by year_month to calculate total amount due and total paid all-time
  const monthsSet = new Set();
  allRides.forEach(r => monthsSet.add(r.date.slice(0, 7)));

  // Also include any explicit payment or price records
  const priceMonths = db.prepare('SELECT DISTINCT year_month FROM monthly_prices WHERE passenger_id = ?').all(id);
  priceMonths.forEach(m => monthsSet.add(m.year_month));
  const paymentMonths = db.prepare('SELECT DISTINCT year_month FROM monthly_payments WHERE passenger_id = ?').all(id);
  paymentMonths.forEach(m => monthsSet.add(m.year_month));

  let allTimeAmountDue = 0;
  let allTimeAmountPaid = 0;

  const monthlyHistory = [];

  const sortedMonths = Array.from(monthsSet).sort().reverse();
  for (const ym of sortedMonths) {
    const ymRidesCount = db.prepare('SELECT COUNT(*) as count FROM rides WHERE passenger_id = ? AND date LIKE ?')
      .get(id, `${ym}%`).count;
    const ymPrice = getPassengerPriceForMonth(id, ym);
    const ymTotal = ymRidesCount * ymPrice;
    const ymPaidRow = db.prepare('SELECT paid FROM monthly_payments WHERE passenger_id = ? AND year_month = ?')
      .get(id, ym);
    const ymPaid = ymPaidRow ? Boolean(ymPaidRow.paid) : false;

    allTimeAmountDue += ymTotal;
    if (ymPaid) {
      allTimeAmountPaid += ymTotal;
    }

    monthlyHistory.push({
      year_month: ym,
      rides_count: ymRidesCount,
      price: ymPrice,
      total_amount: ymTotal,
      paid: ymPaid
    });
  }

  res.json({
    passenger,
    selected_month: {
      year_month,
      tam_count,
      zpet_count,
      total_rides,
      price,
      total_amount,
      paid,
      calendar_days: calendarDays
    },
    all_time: {
      total_rides: allTimeRides,
      tam_count: allTimeTam,
      zpet_count: allTimeZpet,
      total_amount_due: allTimeAmountDue,
      total_amount_paid: allTimeAmountPaid,
      total_amount_unpaid: allTimeAmountDue - allTimeAmountPaid
    },
    history: monthlyHistory
  });
});

module.exports = router;
