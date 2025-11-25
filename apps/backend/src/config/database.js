const { Sequelize } = require('sequelize');

// Konfiguracja połączenia z bazą danych
const sequelize = new Sequelize(
  process.env.DB_NAME || 'domradar',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test połączenia
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Połączenie z bazą danych zostało ustanowione.');
    
    // Załaduj modele
    const User = require('../models/User');
    const Property = require('../models/Property');
    
    // Synchronizuj modele z bazą (tylko w development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false }); // alter: true aktualizowałoby schemat
      console.log('✅ Modele zsynchronizowane z bazą danych.');
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Baza danych niedostępna - serwer działa bez DB');
    return false;
  }
};

module.exports = { sequelize, testConnection };
