const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
initDb();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api', apiRoutes);

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint nebyl nalezen.' });
  }
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  res.sendFile(distIndex, (err) => {
    if (err) {
      res.status(200).send('Brych Taxi Backend App Running');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Brych Taxi server running on port ${PORT}`);
});
