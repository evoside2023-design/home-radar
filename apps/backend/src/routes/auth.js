const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - Rejestracja
router.post('/register', [
  body('email')
    .isEmail()
    .withMessage('Podaj prawidłowy adres email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Hasło musi mieć minimum 6 znaków'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Imię musi mieć minimum 2 znaki'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nazwisko musi mieć minimum 2 znaki')
], authController.register);

// POST /api/auth/login - Logowanie
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Podaj prawidłowy adres email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Hasło jest wymagane')
], authController.login);

// GET /api/auth/me - Pobierz dane zalogowanego użytkownika (wymaga autoryzacji)
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
