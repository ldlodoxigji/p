const sequelize = require('../models');

/**
 * Выполняет sequelize.sync() только если явно разрешено.
 * Возвращает true, если синхронизация проведена, иначе false.
 */
async function syncIfAllowed() {
  if (process.env.ALLOW_DB_SYNC !== 'true') {
    console.warn('sequelize.sync() пропущен: установите ALLOW_DB_SYNC=true, чтобы разрешить изменения БД.');
    return false;
  }

  await sequelize.sync();
  return true;
}

module.exports = { syncIfAllowed };
