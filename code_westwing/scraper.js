const https = require('https');
const cheerio = require('cheerio');

// ===== БД =====
const sequelize = require('../models');
const Page = require('../models/Page');
const ParsedData = require('../models/ParsedData');
// ==============

function parseWestwing(pageRecord) {
  console.log('Загружаем страницу Westwing...');

  https.get('https://www.westwing.es/muebles/', (response) => {
    let html = '';

    response.on('data', (chunk) => {
      html += chunk;
    });

    response.on('end', async () => {
      const $ = cheerio.load(html);

      let savedCount = 0;
      const uniqueLinks = new Set();

      $('a').each(async (i, element) => {
        const link = $(element);
        const href = link.attr('href');
        const text = link.text().trim();

        if (
          href &&
          href.includes('.html') &&
          !href.includes('account') &&
          !href.includes('customer') &&
          text.length > 10 &&
          text.length < 100
        ) {
          if (uniqueLinks.has(href)) return;
          uniqueLinks.add(href);

          const priceElement = link.closest('div').find('div').filter((i, el) => {
            return $(el).text().includes('€');
          }).first();

          let price = 'Цена не указана';
          if (priceElement.length > 0) {
            const raw = priceElement.text().trim();
            const match = raw.match(/[\d.,]+\s*€/);
            if (match) price = match[0];
          }

          console.log(`Найден: ${text} - ${price}`);
          console.log(`Ссылка: https://www.westwing.es${href}`);
          console.log('---');

          // ===== СОХРАНЕНИЕ В БД =====
          await ParsedData.create({
            title: text,
            price,
            rating: '',
            unitsSold: '',
            category: 'Westwing',
            PageId: pageRecord.id
          });
          // ==========================

          savedCount++;
        }
      });

      // Небольшая задержка, чтобы async-вставки успели завершиться
      setTimeout(() => {
        console.log(`Успешно сохранено товаров: ${savedCount}`);
        console.log('Данные сохранены в БД');
      }, 2000);
    });
  }).on('error', (error) => {
    console.log('Ошибка:', error.message);
  });
}

async function main() {
  console.log('=== Парсинг Westwing ===');
  console.log('=======================\n');

  const url = 'https://www.westwing.es/muebles/';

  try {
    await sequelize.sync();

    const pageRecord = await Page.create({
      url,
      html: 'HTML получен через HTTPS (Westwing)'
    });

    parseWestwing(pageRecord);

  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

// Запуск
main();
