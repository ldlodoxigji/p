<<<<<<< HEAD
const { runScraper, closeDatabase } = require('./scraper');
=======
const { runScraper } = require('./scraper');
>>>>>>> ec02edbb5c60c662063e3cb3b17b1a0c7b57eba1

(async () => {
  try {
    await runScraper();
    console.log('Парсинг завершён, данные сохранены в БД');
  } catch (err) {
    console.error('Ошибка выполнения:', err.message);
<<<<<<< HEAD
  } finally {
    await closeDatabase();
=======
>>>>>>> ec02edbb5c60c662063e3cb3b17b1a0c7b57eba1
  }
})();
