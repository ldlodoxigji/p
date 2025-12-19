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
    await sequelize.sync();

    for (const store of stores) {
      console.log(`Запуск ${store.name} парсера...`);
      const page = await Page.create({ url: store.url, html: store.html });
      await store.run(page);
      console.log(`${store.name}: парсинг завершён, данные сохранены в БД`);
    }
  } catch (err) {
    console.error('Ошибка выполнения:', err.message);
  } finally {
    await sequelize.close();
  }
}

// Экспортируем функцию для PM2
module.exports = { runScraper };

// Если запускаем напрямую
if (require.main === module) {
  runScraper()
    .then(() => {
      console.log('Скрипт завершён');
      process.exit(0);
    })
    .catch(err => {
      console.error('Критическая ошибка:', err);
      process.exit(1);
    });
}