const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'brych-taxi-super-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyToken(req) {
  let token = null;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ error: 'Pro tuto akci je vyžadováno přihlášení administrátora.' });
  }
  req.user = decoded;
  next();
}

function optionalAuth(req, res, next) {
  const decoded = verifyToken(req);
  req.user = decoded || null;
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  requireAdmin,
  optionalAuth
};
