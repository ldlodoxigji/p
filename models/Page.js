const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Page = sequelize.define('Page', {
  url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  html: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = Page;
