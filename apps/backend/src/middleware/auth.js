const jwt = require('jsonwebtoken');

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7); // Usuń 'Bearer '
};

const decodeToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return {
    id: decoded.id,
    email: decoded.email,
    isPremium: decoded.isPremium
  };
};

/**
 * Wymaga ważnego tokenu JWT. Ustawia req.user.
 */
const authMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Brak tokenu autoryzacji' });
    }
    req.user = decodeToken(token);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Nieprawidłowy token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token wygasł' });
    }
    return res.status(500).json({ error: 'Błąd autoryzacji' });
  }
};

/**
 * Token opcjonalny: jeśli jest i jest poprawny – ustawia req.user,
 * jeśli go brak lub jest błędny – przepuszcza jako gościa.
 */
const optionalAuth = (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = decodeToken(token);
    } catch (error) {
      req.user = null;
    }
  }
  next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;
