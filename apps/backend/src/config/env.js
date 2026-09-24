const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Fail-fast: brakujące sekrety mają zatrzymać serwer przy starcie,
 * a nie wywalić się losowo w runtime przy pierwszym logowaniu.
 */
const required = ['JWT_SECRET'];
if (isProduction) {
  required.push('DB_PASSWORD', 'FRONTEND_URL');
}

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  if (isTest) {
    // W testach ustawiamy bezpieczne wartości zastępcze
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  } else {
    console.error(`❌ Brak wymaganych zmiennych środowiskowych: ${missing.join(', ')}`);
    console.error('   Skopiuj .env.example do .env w katalogu głównym repo i uzupełnij wartości.');
    process.exit(1);
  }
}

if (!isProduction && process.env.JWT_SECRET === 'your_jwt_secret_here_change_in_production') {
  console.warn('⚠️  JWT_SECRET ma wartość domyślną z .env.example – zmień ją przed wdrożeniem.');
}

module.exports = {
  isProduction,
  isTest,
  port: parseInt(process.env.PORT, 10) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};
