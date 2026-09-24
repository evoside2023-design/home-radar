const { sequelize } = require('../config/database');
const User = require('./User');
const Property = require('./Property');

module.exports = { sequelize, User, Property };
