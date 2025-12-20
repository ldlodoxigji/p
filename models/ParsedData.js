const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const ParsedData = sequelize.define('ParsedData', {
  title: DataTypes.TEXT,
  price: DataTypes.STRING,
  rating: DataTypes.STRING,
  unitsSold: DataTypes.STRING,
  category: DataTypes.STRING,
  PageId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Pages',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
}, {
  timestamps: true,
});

module.exports = ParsedData;
