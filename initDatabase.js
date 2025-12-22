const { DataTypes, QueryTypes } = require('sequelize');
const sequelize = require('./models');

async function columnExists(table, column) {
  const columns = await sequelize.query(`PRAGMA table_info(${table});`, { type: QueryTypes.SELECT });
  return columns.some((col) => col.name === column);
}

async function ensureParsedDataPageId(qi) {
  const hasPageId = await columnExists('ParsedData', 'PageId').catch(async () => {
    const parsedColumns = await qi.describeTable('ParsedData').catch(() => ({}));
    return Boolean(parsedColumns.PageId);
  });

  if (!hasPageId) {
    try {
      await qi.addColumn('ParsedData', 'PageId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Pages',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    } catch (error) {

      if (String(error.message).includes('duplicate column name: PageId')) {
        return;
      }
      throw error;
    }
  }
}

async function initializeDatabase() {
  await sequelize.sync();

  const qi = sequelize.getQueryInterface();
  await ensureParsedDataPageId(qi);
}

module.exports = {
  initializeDatabase,
};

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Структура БД проверена и актуализирована.');
      return sequelize.close();
    })
    .catch((err) => {
      console.error('Ошибка инициализации БД:', err);
      return sequelize.close().finally(() => process.exit(1));
    });
}