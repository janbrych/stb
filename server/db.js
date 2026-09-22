const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'brych_taxi.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin'
    );

    CREATE TABLE IF NOT EXISTS passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      default_price REAL NOT NULL DEFAULT 50,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monthly_prices (
      passenger_id INTEGER NOT NULL,
      year_month TEXT NOT NULL,
      price REAL NOT NULL,
      PRIMARY KEY (passenger_id, year_month),
      FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passenger_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      direction TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(passenger_id, date, direction),
      FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monthly_payments (
      passenger_id INTEGER NOT NULL,
      year_month TEXT NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (passenger_id, year_month),
      FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE CASCADE
    );
  `);

  // Ensure Admin account exists
  const adminEmail = 'janbrych21@gmail.com';
  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);

  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync('Jasiek04', 10);
    db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').run(adminEmail, passwordHash, 'admin');
    console.log('Admin user initialized:', adminEmail);
  } else {
    // Ensure password is updated if changed in config
    const passwordHash = bcrypt.hashSync('Jasiek04', 10);
    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(passwordHash, adminEmail);
  }

  // Seed initial passengers if empty
  const passengerCount = db.prepare('SELECT COUNT(*) as count FROM passengers').get().count;
  if (passengerCount === 0) {
    const insertPassenger = db.prepare('INSERT INTO passengers (name, default_price) VALUES (?, ?)');
    const insertPrice = db.prepare('INSERT INTO monthly_prices (passenger_id, year_month, price) VALUES (?, ?, ?)');

    const honza = insertPassenger.run('Honza', 50);
    const kuba = insertPassenger.run('Kuba', 40);
    const petr = insertPassenger.run('Petr', 60);

    const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-03"

    insertPrice.run(honza.lastInsertRowid, currentYearMonth, 50);
    insertPrice.run(kuba.lastInsertRowid, currentYearMonth, 40);
    insertPrice.run(petr.lastInsertRowid, currentYearMonth, 60);

    // Seed a couple of demo rides for today
    const today = new Date().toISOString().slice(0, 10);
    const insertRide = db.prepare('INSERT INTO rides (passenger_id, date, direction) VALUES (?, ?, ?)');
    insertRide.run(honza.lastInsertRowid, today, 'TAM');
    insertRide.run(honza.lastInsertRowid, today, 'ZPET');
    insertRide.run(kuba.lastInsertRowid, today, 'TAM');

    console.log('Sample passengers and rides seeded.');
  }
}

// Price retrieval helper for a given passenger and month (YYYY-MM)
function getPassengerPriceForMonth(passengerId, yearMonth) {
  const row = db.prepare(`
    SELECT price FROM monthly_prices
    WHERE passenger_id = ? AND year_month <= ?
    ORDER BY year_month DESC
    LIMIT 1
  `).get(passengerId, yearMonth);

  if (row) {
    return row.price;
  }

  // Fallback to default price in passenger record or earliest price set
  const passenger = db.prepare('SELECT default_price FROM passengers WHERE id = ?').get(passengerId);
  return passenger ? passenger.default_price : 50;
}

module.exports = {
  db,
  initDb,
  getPassengerPriceForMonth
};
