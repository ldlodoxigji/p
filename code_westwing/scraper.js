const https = require('https');
const cheerio = require('cheerio');

// ===== БД =====
const ParsedData = require('../models/ParsedData');
// ==============

function fetchWestwingHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let html = '';

      response.on('data', (chunk) => {
        html += chunk;
      });

      response.on('end', () => resolve(html));
    }).on('error', (error) => reject(error));
  });
}

async function parseWestwing(html, pageRecord) {
  const $ = cheerio.load(html);

  let savedCount = 0;
  const uniqueLinks = new Set();

  const anchors = $('a');

  for (let i = 0; i < anchors.length; i++) {
    const link = $(anchors[i]);
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
      if (uniqueLinks.has(href)) continue;
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
  }

  console.log(`Успешно сохранено товаров: ${savedCount}`);
  console.log('Данные сохранены в БД');
}

async function scrapeWestwing(pageRecord, url = 'https://www.westwing.es/muebles/') {
  console.log('=== Парсинг Westwing ===');
  console.log('=======================\n');

  try {
    const html = await fetchWestwingHtml(url);
    await parseWestwing(html, pageRecord);
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

module.exports = { scrapeWestwing };
