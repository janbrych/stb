const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'brych_taxi.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Foreign keys enable
  db.run('PRAGMA foreign_keys = ON');

  // Users table (Admin)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);

  // Passengers table
  db.run(`
    CREATE TABLE IF NOT EXISTS passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      default_price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Rides table: ride_date in format YYYY-MM-DD
  // direction: 'TO_SCHOOL', 'FROM_SCHOOL', 'BOTH'
  db.run(`
    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passenger_id INTEGER NOT NULL,
      ride_date TEXT NOT NULL,
      direction TEXT NOT NULL,
      FOREIGN KEY(passenger_id) REFERENCES passengers(id) ON DELETE CASCADE,
      UNIQUE(passenger_id, ride_date)
    )
  `);

  // Monthly settings (price override and paid status per passenger per YYYY-MM)
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_settings (
      passenger_id INTEGER NOT NULL,
      year_month TEXT NOT NULL,
      price_per_ride REAL,
      is_paid INTEGER DEFAULT 0,
      PRIMARY KEY(passenger_id, year_month),
      FOREIGN KEY(passenger_id) REFERENCES passengers(id) ON DELETE CASCADE
    )
  `);

  // Seed default admin account
  const adminEmail = 'janbrych21@gmail.com';
  const adminPass = 'Jasiek04';

  db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err);
      return;
    }
    if (!row) {
      const hash = bcrypt.hashSync(adminPass, 10);
      db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [adminEmail, hash], (err) => {
        if (err) console.error('Error seeding admin user:', err);
        else console.log('Admin user seeded successfully');
      });
    } else {
      // Update password to ensure it matches requirement
      const hash = bcrypt.hashSync(adminPass, 10);
      db.run('UPDATE users SET password_hash = ? WHERE email = ?', [hash, adminEmail]);
    }
  });
});

module.exports = db;
