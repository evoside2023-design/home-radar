const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    // Pobierz token z headera Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Brak tokenu autoryzacji' 
      });
    }

    const token = authHeader.substring(7); // Usuń 'Bearer '

    // Weryfikuj token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Dodaj dane użytkownika do requesta
    req.user = {
      id: decoded.id,
      email: decoded.email,
      isPremium: decoded.isPremium
    };

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

module.exports = authMiddleware;
