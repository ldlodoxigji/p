const sequelize = require('./models');
const Page = require('./models/Page');
const { scrapeAmazon } = require('./code_amazon/scraper');

async function runScraper() {
  let sequelizeInstance = null;
  
  try {
    sequelizeInstance = await sequelize.sync();

    const page = await Page.create({
      url: 'https://www.amazon.es/gp/bestsellers',
      html: 'HTML сохранён в рамках практической работы №3',
    });

    console.log('Запуск Amazon парсера...');
    await scrapeAmazon(page.id);

    console.log('Парсинг завершён, данные сохранены в БД');
  } catch (err) {
    console.error('Ошибка выполнения:', err.message);
  } finally {
    if (sequelizeInstance) {
      await sequelizeInstance.close();
    }
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