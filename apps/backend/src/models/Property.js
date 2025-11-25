const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  external_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'ID ogłoszenia w zewnętrznym serwisie'
  },
  source: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Źródło ogłoszenia (olx/otodom)'
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'PLN'
  },
  area: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: 'Powierzchnia w m²'
  },
  rooms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  property_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  transaction_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  location: {
    type: DataTypes.GEOGRAPHY('POINT', 4326),
    allowNull: true,
    comment: 'PostGIS POINT dla zaawansowanych zapytań geograficznych'
  },
  images: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Tablica URL-i wszystkich zdjęć'
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Link do oryginalnego ogłoszenia'
  },
  contact_info: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Czy ogłoszenie jest nadal aktywne'
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'properties',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: []  // Indeksy są już w schema.sql
});

module.exports = Property;
