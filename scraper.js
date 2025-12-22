const { DataTypes } = require('sequelize');
const sequelize = require('./models');
const Page = require('./models/Page');
const { scrapeAmazon } = require('./code_amazon/scraper');
const { scrapeCoolmod } = require('./code_coolmod/scraper');
const { scrapeStradivariusStore } = require('./code_stradivarius/scraper');
const { scrapeUlanka } = require('./code_ulanka/scraper');
const { scrapeWestwing } = require('./code_westwing/scraper');

const stores = [
  {
    name: 'Amazon',
    url: 'https://www.amazon.es/gp/bestsellers',
    html: 'HTML сохранён в рамках практической работы №3',
    run: async (page) => scrapeAmazon(page.id),
  },
  {
    name: 'Coolmod',
    url: 'https://www.coolmod.com/coolpcs-black/',
    html: 'HTML получен через Puppeteer (Coolmod)',
    run: async (page) => scrapeCoolmod(page),
  },
  {
    name: 'Stradivarius',
    url: 'https://www.stradivarius.com/ic/mujer/ropa/sudaderas-n1989',
    html: 'HTML получен через Puppeteer (Stradivarius)',
    run: async (page) => scrapeStradivariusStore(page),
  },
  {
    name: 'Ulanka',
    url: 'https://ulanka.com/en-eu/pages/look-1',
    html: 'HTML получен через HTTPS (Ulanka)',
    run: async (page) => scrapeUlanka(page),
  },
  {
    name: 'Westwing',
    url: 'https://www.westwing.es/muebles/',
    html: 'HTML получен через HTTPS (Westwing)',
    run: async (page) => scrapeWestwing(page),
  },
];

async function runScraper() {
  try {
    const qi = sequelize.getQueryInterface();
    const parsedColumns = await qi.describeTable('ParsedData').catch(() => ({}));
    if (!parsedColumns.pageId) {
      await qi.addColumn('ParsedData', 'pageId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Pages',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
    for (const store of stores) {
      console.log(`Запуск ${store.name} парсера...`);
      const page = await Page.create({ url: store.url, html: store.html });
      await store.run(page);
      console.log(`${store.name}: парсинг завершён, данные сохранены в БД`);
    }
  } catch (err) {
    console.error('Ошибка выполнения:', err.message);
  }
}

async function closeDatabase() {
  await sequelize.close();
}

// Экспортируем функцию для PM2
module.exports = { runScraper, closeDatabase };

// Если запускаем напрямую
if (require.main === module) {
  runScraper()
    .then(() => {
      console.log('Скрипт завершён');
      return closeDatabase();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('Критическая ошибка:', err);
      return closeDatabase().finally(() => {
        process.exit(1);
      });
    });
}
