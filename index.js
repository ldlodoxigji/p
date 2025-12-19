const { runScraper } = require('./scraper');

(async () => {
  try {
    await runScraper();
    console.log('Парсинг завершён, данные сохранены в БД');
  } catch (err) {
    console.error('Ошибка выполнения:', err.message);
  }
})();
