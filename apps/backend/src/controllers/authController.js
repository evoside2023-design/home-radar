const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// Rejestracja nowego użytkownika
exports.register = async (req, res) => {
  try {
    // Walidacja
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    // Sprawdź czy użytkownik już istnieje
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Użytkownik z tym adresem email już istnieje' 
      });
    }

    // Hashuj hasło
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Utwórz użytkownika
    const user = await User.create({
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      phone
    });

    // Wygeneruj token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        isPremium: user.is_premium 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Rejestracja przebiegła pomyślnie',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isPremium: user.is_premium
      }
    });
  } catch (error) {
    console.error('Błąd rejestracji:', error);
    res.status(500).json({ error: 'Błąd serwera podczas rejestracji' });
  }
};

// Logowanie użytkownika
exports.login = async (req, res) => {
  try {
    // Walidacja
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Znajdź użytkownika
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ 
        error: 'Nieprawidłowy email lub hasło' 
      });
    }

    // Sprawdź hasło
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Nieprawidłowy email lub hasło' 
      });
    }

    // Wygeneruj token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        isPremium: user.is_premium 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Logowanie pomyślne',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isPremium: user.is_premium,
        isVerified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ error: 'Błąd serwera podczas logowania' });
  }
};

// Pobierz dane zalogowanego użytkownika
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'is_verified', 'is_premium', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        isVerified: user.is_verified,
        isPremium: user.is_premium,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Błąd pobierania danych użytkownika:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
};
