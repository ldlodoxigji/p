const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const ParsedData = sequelize.define('ParsedData', {
  title: DataTypes.TEXT,
  price: DataTypes.STRING,
  rating: DataTypes.STRING,
  unitsSold: DataTypes.STRING,
  category: DataTypes.STRING,
}, {
  timestamps: true,
});

module.exports = ParsedData;
