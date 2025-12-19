const sequelize = require('./models');
const Page = require('./models/Page');
const { scrapeAmazon } = require('./code_amazon/scraper');

(async () => {
  try {
    await sequelize.sync();

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
    await sequelize.close();
  }
})();
