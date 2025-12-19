const cron = require('node-cron');
const { runScraper } = require('./scraper');

// Запуск каждые 5 минут (на 0-й, 5-й, 10-й и т.д. минуте каждого часа)
cron.schedule('*/5 * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Запуск парсера по расписанию...`);
  
  try {
    await runScraper();
    console.log(`[${new Date().toISOString()}] Парсинг успешно завершён`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ошибка при выполнении парсера:`, error.message);
  }
});

// Запустить сразу при старте
(async () => {
  console.log(`[${new Date().toISOString()}] Первоначальный запуск парсера...`);
  try {
    await runScraper();
    console.log(`[${new Date().toISOString()}] Первоначальный парсинг завершён`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ошибка при первоначальном запуске:`, error.message);
  }
})();

console.log(`[${new Date().toISOString()}] Планировщик запущен. Перезапуск каждые 5 минут.`);